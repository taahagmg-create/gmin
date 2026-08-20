import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";

/**
 * Beautify one photo: segment the car, centre it on a showroom stage, composite.
 *
 * THE GUARANTEE: the car's pixels are never resized, resampled, colour-managed
 * or passed through the image model. The cutout is cropped to its bounding box
 * and repositioned (centred horizontally, anchored at 68 % height) — pixel
 * values are unchanged, only placement on the canvas differs.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-image";
const COST_PER_IMAGE_USD = 0.134;
const MAX_RETRIES = 4;
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);

export async function generateScene(prompt, apiKey) {
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
          costUsd: COST_PER_IMAGE_USD,
        };
      }
    }
    throw new Error("no image in Gemini response");
  }
}

function fadeMask(width, height) {
  return Buffer.from(
    `<svg width="${width}" height="${height}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/>
         <stop offset="50%" stop-color="#fff" stop-opacity="0.12"/>
         <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
       </linearGradient></defs>
       <rect width="${width}" height="${height}" fill="url(#g)"/>
     </svg>`,
  );
}

function turntableSvg(w, h) {
  const cx = Math.round(w / 2);
  const surfY = Math.round(h * 0.42);
  const surfRY = Math.round(h * 0.40);
  const edgeY = Math.round(h * 0.58);
  const edgeRY = Math.round(h * 0.42);
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <radialGradient id="wood" cx="50%" cy="38%">
           <stop offset="0%" stop-color="#A89070"/>
           <stop offset="50%" stop-color="#8B7355"/>
           <stop offset="100%" stop-color="#5A4630"/>
         </radialGradient>
         <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#7D6B50"/>
           <stop offset="100%" stop-color="#3D3020"/>
         </linearGradient>
       </defs>
       <ellipse cx="${cx}" cy="${edgeY}" rx="${cx}" ry="${edgeRY}" fill="url(#edge)"/>
       <ellipse cx="${cx}" cy="${surfY}" rx="${cx}" ry="${surfRY}" fill="url(#wood)"/>
       <ellipse cx="${cx}" cy="${surfY}" rx="${cx - 2}" ry="${surfRY - 2}"
                fill="none" stroke="#C4B090" stroke-width="1" opacity="0.18"/>
     </svg>`,
  );
}

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

/**
 * Reject images that aren't a full car exterior — close-ups of wheels,
 * interior shots, engine bays, etc. A real car exterior is wider than
 * tall (AR > 1.2) and spans most of the frame width. Wheels and
 * steering wheels are roughly circular (AR ~ 1.0) and fail the check.
 */
function isCarExterior(bounds, width, height) {
  const bw = bounds.right - bounds.left;
  const bh = bounds.bottom - bounds.top;
  const ar = bw / bh;
  const widthRatio = bw / width;
  return ar >= 1.2 && widthRatio >= 0.50 && bh / height >= 0.25;
}

/**
 * @param {object} opts
 * @param {string} opts.sourceUrl    — CDN URL for the source photo
 * @param {object} opts.scene        — scene config from scenes.ts
 * @param {Buffer} [opts.sceneBuffer] — pre-loaded scene image (skips Gemini)
 * @param {string} [opts.apiKey]     — Gemini key (required if no sceneBuffer)
 * @param {object} [opts.logo]       — optional logo overlay config
 */
export async function beautifyPhoto({ sourceUrl, scene, sceneBuffer, apiKey, logo }) {
  // 1. Source photo — the canvas dimensions everything else conforms to.
  const srcRes = await fetch(sourceUrl, { headers: { "user-agent": "EsteemCarsSite/1.0" } });
  if (!srcRes.ok) throw new Error(`source ${srcRes.status}`);
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const { width, height, format } = await sharp(srcBuf).metadata();
  if (!width || !height) throw new Error("could not read source dimensions");

  // 2. Segment.
  console.log(`    seg: ${width}x${height} ${format}`);
  const cutBlob = await removeBackground(sourceUrl);
  const cutout = Buffer.from(await cutBlob.arrayBuffer());

  const cutMeta = await sharp(cutout).metadata();
  if (cutMeta.width !== width || cutMeta.height !== height) {
    throw new Error(
      `segmentation changed dimensions (${cutMeta.width}x${cutMeta.height} vs ${width}x${height})`,
    );
  }

  // 3. Car detection — reject non-exterior images.
  const bounds = await alphaBounds(cutout, width, height);
  if (!isCarExterior(bounds, width, height)) {
    const bw = bounds.right - bounds.left;
    const bh = bounds.bottom - bounds.top;
    const pct = ((bw * bh) / (width * height) * 100).toFixed(0);
    return { skipped: true, reason: `subject ${bw}x${bh} (${pct}% of frame)` };
  }

  // 4. Reposition — centre the car horizontally, anchor bottom at 68 % of frame.
  const carW = bounds.right - bounds.left;
  const carH = bounds.bottom - bounds.top;

  const bottomGap = height - bounds.bottom;
  const trimBottom = bottomGap < 5 ? Math.min(5 - bottomGap, Math.floor(carH * 0.02)) : 0;
  const cleanCarH = carH - trimBottom;

  const carCrop = await sharp(cutout)
    .extract({ left: bounds.left, top: bounds.top, width: carW, height: cleanCarH })
    .png()
    .toBuffer();

  const targetLeft = Math.max(0, Math.round((width - carW) / 2));
  const targetBottom = Math.round(height * 0.72);
  const targetTop = Math.max(0, targetBottom - cleanCarH);
  const actualBottom = targetTop + cleanCarH;

  const centeredCutout = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: carCrop, left: targetLeft, top: targetTop }])
    .png()
    .toBuffer();

  // 5. Background — static scene or generated.
  let background;
  let costUsd = 0;
  if (sceneBuffer) {
    background = await sharp(sceneBuffer)
      .resize(width, height, { fit: "cover", position: "centre" })
      .toBuffer();
  } else {
    const generated = await generateScene(scene.prompt, apiKey);
    background = await sharp(generated.buffer)
      .resize(width, height, { fit: "cover", position: "centre" })
      .toBuffer();
    costUsd = generated.costUsd;
  }

  // 6. Contact shadow — positioned under the centred car.
  const shadowHeight = Math.max(8, Math.round(cleanCarH * 0.14));
  const shadowW = Math.round(carW * 1.04);
  const shadow = await sharp(carCrop)
    .extractChannel(3)
    .resize(shadowW, shadowHeight, { fit: "fill" })
    .blur(Math.max(6, Math.round(carW * 0.02)))
    .toBuffer();

  const shadowLeft = Math.max(0, targetLeft - Math.round(carW * 0.02));
  const shadowTop = Math.min(height - shadowHeight, actualBottom - Math.round(shadowHeight * 0.55));

  const shadowLayer = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: shadowW,
            height: shadowHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: scene.shadowStrength },
          },
        })
          .composite([{ input: shadow, blend: "dest-in" }])
          .png()
          .toBuffer(),
        left: shadowLeft,
        top: shadowTop,
      },
    ])
    .png()
    .toBuffer();

  // 7. Floor reflection — flipped car crop placed below the centred car.
  const reflectionMaxH = Math.round(cleanCarH * 0.55);
  const spaceBelow = Math.max(1, height - actualBottom);
  const reflectionHeight = Math.min(reflectionMaxH, spaceBelow);

  let reflectionLayer = null;
  if (reflectionHeight > 12 && scene.floorReflectivity > 0.02) {
    const mirrored = await sharp(carCrop)
      .flip()
      .resize(carW, reflectionHeight, { fit: "cover", position: "top" })
      .composite([{ input: fadeMask(carW, reflectionHeight), blend: "dest-in" }])
      .png()
      .toBuffer();

    reflectionLayer = {
      input: await sharp(mirrored)
        .ensureAlpha()
        .modulate({ brightness: 0.75 })
        .png()
        .toBuffer(),
      left: targetLeft,
      top: actualBottom,
    };
  }

  // 8. Turntable platform — elliptical wooden pad beneath the car.
  const tW = Math.round(carW * 1.15);
  const tH = Math.round(tW * 0.13);
  const turntable = await sharp(turntableSvg(tW, tH)).png().toBuffer();
  const turntableLeft = Math.max(0, Math.round((width - tW) / 2));
  const turntableTop = Math.max(0, actualBottom - Math.round(tH * 0.75));

  // 9. Composite: scene → reflection → turntable → shadow → centred car.
  const layers = [];
  if (reflectionLayer) {
    layers.push({ input: reflectionLayer.input, left: reflectionLayer.left, top: reflectionLayer.top });
  }
  layers.push({ input: turntable, left: turntableLeft, top: turntableTop });
  layers.push({ input: shadowLayer, left: 0, top: 0 });
  layers.push({ input: centeredCutout, left: 0, top: 0 });

  // 10. Logo overlay.
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

  const composite = await sharp(background).composite(layers).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const thumbBuf = await sharp(composite).resize(640, null, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer();

  return { full: composite, thumb: thumbBuf, costUsd, width, height };
}
