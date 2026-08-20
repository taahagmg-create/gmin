import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";

/**
 * Beautify one photo: filter non-car images via segmentation, then send the
 * source photo to Gemini for full showroom placement — the AI handles the
 * turntable, lighting, reflections, and background as one unified scene.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-image";
const COST_PER_IMAGE_USD = 0.134;
const MAX_RETRIES = 4;
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);

const PLACEMENT_PROMPT =
  "Place this exact car in a premium dark automotive showroom. " +
  "The car is perfectly centred on a large circular wooden turntable platform with warm golden-brown wood grain. " +
  "Dark charcoal-grey vertical wall panels as backdrop with subtle panel seams. " +
  "High ceiling with recessed linear LED strip lights and focused spot downlights " +
  "casting dramatic pools of warm white light onto the car and floor. " +
  "Highly polished glossy black floor — mirror-like reflective surface " +
  "showing clear reflections of the car and turntable. " +
  "Professional automotive photography, photorealistic, shot on full-frame camera, 35mm lens. " +
  "CRITICAL: preserve the car's exact model, colour, viewing angle, body shape, badges, " +
  "wheels, and every visual detail. Only change the environment around the car.";

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

async function generatePlacement(base64Jpeg, apiKey) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 180_000);
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: "image/jpeg", data: base64Jpeg } },
                { text: PLACEMENT_PROMPT },
              ],
            }],
          }),
        },
      );
      clearTimeout(timer);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(2 ** attempt * 3000, 30000);
        console.log(`    network error, retry ${attempt + 1}/${MAX_RETRIES} in ${(delay / 1000).toFixed(0)}s… (${err.message})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      if (RETRY_CODES.has(res.status) && attempt < MAX_RETRIES) {
        const delay = Math.min(2 ** attempt * 3000, 30000);
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
 * @param {object} opts.scene        — scene config (unused, kept for API compat)
 * @param {Buffer} [opts.sceneBuffer] — unused, kept for API compat
 * @param {string} opts.apiKey       — Gemini key (required)
 * @param {object} [opts.logo]       — optional logo overlay config
 */
export async function beautifyPhoto({ sourceUrl, scene, sceneBuffer, apiKey, logo }) {
  // 1. Download source photo.
  const srcRes = await fetch(sourceUrl, { headers: { "user-agent": "EsteemCarsSite/1.0" } });
  if (!srcRes.ok) throw new Error(`source ${srcRes.status}`);
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const { width, height, format } = await sharp(srcBuf).metadata();
  if (!width || !height) throw new Error("could not read source dimensions");

  // 2. Segment for car-exterior filtering only.
  console.log(`    seg: ${width}x${height} ${format}`);
  const cutBlob = await removeBackground(sourceUrl);
  const cutout = Buffer.from(await cutBlob.arrayBuffer());
  const bounds = await alphaBounds(cutout, width, height);

  if (!isCarExterior(bounds, width, height)) {
    const bw = bounds.right - bounds.left;
    const bh = bounds.bottom - bounds.top;
    const pct = ((bw * bh) / (width * height) * 100).toFixed(0);
    return { skipped: true, reason: `subject ${bw}x${bh} (${pct}% of frame)` };
  }

  // 3. Full showroom placement via Gemini.
  console.log(`    gen: sending to Gemini for showroom placement…`);
  const base64 = srcBuf.toString("base64");
  const result = await generatePlacement(base64, apiKey);

  // 4. Resize to match original dimensions and encode.
  let output = await sharp(result.buffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  // 5. Logo overlay.
  if (logo?.buffer) {
    const logoWidth = Math.round(width * (logo.widthRatio ?? 0.16));
    const resized = await sharp(logo.buffer)
      .resize(logoWidth, null, { fit: "inside" })
      .png()
      .toBuffer();
    const logoMeta = await sharp(resized).metadata();
    const margin = Math.round(width * 0.025);
    output = await sharp(output)
      .composite([{
        input: resized,
        left: width - logoWidth - margin,
        top: height - (logoMeta.height ?? 0) - margin,
        blend: logo.blend ?? "over",
      }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  }

  const thumbBuf = await sharp(output).resize(640, null, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
  return { full: output, thumb: thumbBuf, costUsd: result.costUsd, width, height };
}
