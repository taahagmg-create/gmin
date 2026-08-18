import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";

/**
 * Beautify one photo: segment the car, generate an empty scene, composite.
 *
 * THE GUARANTEE: the car's pixels are never resized, resampled, colour-managed
 * or passed through the image model. The canvas is the source photo's exact
 * dimensions, the generated scene is resized to fit *that*, and the cutout is
 * composited at (0,0) at native size. Any change to that arrangement — scaling
 * the car to fit a differently-sized scene, for instance — breaks the promise
 * this whole pipeline exists to keep.
 */

const MODEL = "gemini-3-pro-image";
/** Quoted price for a 1K/2K image. Recorded per image so spend is observed. */
const COST_PER_IMAGE_USD = 0.134;

const MAX_RETRIES = 4;
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);

async function generateScene(prompt, apiKey) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      if (RETRY_CODES.has(res.status) && attempt < MAX_RETRIES) {
        const delay = Math.min(2 ** attempt * 2000, 30000);
        console.log(`    gemini ${res.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${(delay / 1000).toFixed(0)}s…`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(`gemini ${res.status}: ${body}`);
    }

    const json = await res.json();
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p.inline_data ?? p.inlineData;
      if (inline?.data) {
        return {
          buffer: Buffer.from(inline.data, "base64"),
          tokens: json.usageMetadata?.candidatesTokenCount ?? null,
          costUsd: COST_PER_IMAGE_USD,
        };
      }
    }
    throw new Error("no image in Gemini response");
  }
}

/** Vertical alpha gradient used to fade the reflection out. */
function fadeMask(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#fff" stop-opacity="0.45"/>
         <stop offset="60%" stop-color="#fff" stop-opacity="0.06"/>
         <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="${width}" height="${height}" fill="url(#g)"/>
     </svg>`,
  );
}

/** Bounding box of non-transparent pixels, so shadow and reflection sit right. */
async function alphaBounds(cutout, width, height) {
  const alpha = await sharp(cutout).ensureAlpha().extractChannel(3).raw().toBuffer();
  let top = height, bottom = 0, left = width, right = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > 24) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom <= top) throw new Error("segmentation produced an empty mask");
  return { top, bottom, left, right };
}

export async function beautifyPhoto({ sourceUrl, scene, apiKey, logo }) {
  // 1. Source photo — the canvas dimensions everything else conforms to.
  const srcRes = await fetch(sourceUrl, { headers: { "user-agent": "EsteemCarsSite/1.0" } });
  if (!srcRes.ok) throw new Error(`source ${srcRes.status}`);
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const { width, height, format } = await sharp(srcBuf).metadata();
  if (!width || !height) throw new Error("could not read source dimensions");

  // 2. Segment. Output is the same dimensions as the input, so the car keeps
  //    its original position and scale.
  console.log(`    seg: ${width}x${height} ${format}`);
  const cutBlob = await removeBackground(sourceUrl);
  const cutout = Buffer.from(await cutBlob.arrayBuffer());

  const cutMeta = await sharp(cutout).metadata();
  if (cutMeta.width !== width || cutMeta.height !== height) {
    throw new Error(
      `segmentation changed dimensions (${cutMeta.width}x${cutMeta.height} vs ${width}x${height}) — ` +
        "compositing it would resample the car",
    );
  }

  // 3. Empty scene, resized to cover the canvas. The scene bends to the photo,
  //    never the other way round.
  const generated = await generateScene(scene.prompt, apiKey);
  const background = await sharp(generated.buffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .toBuffer();

  const bounds = await alphaBounds(cutout, width, height);
  const carWidth = bounds.right - bounds.left;
  const contactY = bounds.bottom;

  // 4. Contact shadow, derived from the real silhouette rather than drawn.
  const shadowHeight = Math.max(8, Math.round((bounds.bottom - bounds.top) * 0.14));
  const shadow = await sharp(cutout)
    .extractChannel(3)
    .resize(Math.round(carWidth * 1.04), shadowHeight, { fit: "fill" })
    .blur(Math.max(6, Math.round(carWidth * 0.02)))
    .toBuffer();

  const shadowLayer = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: Math.round(carWidth * 1.04),
            height: shadowHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: scene.shadowStrength },
          },
        })
          .composite([{ input: shadow, blend: "dest-in" }])
          .png()
          .toBuffer(),
        left: Math.max(0, bounds.left - Math.round(carWidth * 0.02)),
        top: Math.min(height - shadowHeight, contactY - Math.round(shadowHeight * 0.55)),
      },
    ])
    .png()
    .toBuffer();

  // 5. Floor reflection — the car mirrored, faded, and dimmed by floor type.
  const reflectionHeight = Math.min(
    Math.round((bounds.bottom - bounds.top) * 0.55),
    Math.max(1, height - contactY),
  );

  let reflectionLayer = null;
  if (reflectionHeight > 12 && scene.floorReflectivity > 0.02) {
    const mirrored = await sharp(cutout)
      .flip()
      .resize(width, reflectionHeight, { fit: "cover", position: "top" })
      .composite([{ input: fadeMask(width, reflectionHeight), blend: "dest-in" }])
      .png()
      .toBuffer();

    reflectionLayer = {
      input: await sharp(mirrored)
        .ensureAlpha()
        .modulate({ brightness: 0.72 })
        .png()
        .toBuffer(),
      left: 0,
      top: contactY,
      opacity: scene.floorReflectivity,
    };
  }

  // 6. Composite. Order matters: scene, reflection, shadow, then the untouched
  //    car last so nothing can draw over it.
  const layers = [];
  if (reflectionLayer) {
    layers.push({ input: reflectionLayer.input, left: reflectionLayer.left, top: reflectionLayer.top });
  }
  layers.push({ input: shadowLayer, left: 0, top: 0 });
  layers.push({ input: cutout, left: 0, top: 0 });

  // 7. Logo — a fixed, deterministic overlay. Identical on every image, never
  //    generated. Skipped entirely rather than approximated when unavailable.
  if (logo?.buffer) {
    const logoWidth = Math.round(width * (logo.widthRatio ?? 0.16));
    const resized = await sharp(logo.buffer)
      .resize(logoWidth, null, { fit: "inside" })
      .png()
      .toBuffer();
    const logoMeta = await sharp(resized).metadata();
    const margin = Math.round(width * 0.025);
    layers.push({
      input: resized,
      left: width - logoWidth - margin,
      top: height - (logoMeta.height ?? 0) - margin,
      blend: logo.blend ?? "over",
    });
  }

  const outBuf = await sharp(background).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const thumbBuf = await sharp(outBuf).resize(640, null, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer();

  return {
    full: outBuf,
    thumb: thumbBuf,
    costUsd: generated.costUsd,
    tokens: generated.tokens,
    width,
    height,
  };
}
