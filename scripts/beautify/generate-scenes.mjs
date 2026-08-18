import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { generateScene } from "./pipeline.mjs";

/**
 * One-time generator: creates the 3 static background scenes used by the
 * beautification pipeline. Run once, commit the output, and every subsequent
 * pipeline run uses the same backgrounds — perfect consistency, zero API cost.
 *
 * Usage:  node --experimental-strip-types --import ./register.mjs generate-scenes.mjs
 * Needs:  GEMINI_API_KEY
 * Cost:   ~$0.40 (3 images)
 */

const { SCENES } = await import("@/lib/beautify/scenes.ts");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

const outDir = path.resolve(import.meta.dirname, "scenes");
fs.mkdirSync(outDir, { recursive: true });

let totalCost = 0;

for (const scene of SCENES) {
  const outPath = path.join(outDir, `${scene.id}.jpg`);
  if (fs.existsSync(outPath) && !process.argv.includes("--force")) {
    console.log(`  ${scene.id} — already exists, skipping (use --force to regenerate)`);
    continue;
  }

  console.log(`generating ${scene.id}…`);
  const result = await generateScene(scene.prompt, apiKey);
  totalCost += result.costUsd;

  const saved = await sharp(result.buffer)
    .resize(2048, 1536, { fit: "cover", position: "centre" })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(outPath, saved);
  console.log(`  saved ${scene.id}.jpg (${(saved.length / 1024).toFixed(0)}KB)`);
}

console.log(`\ndone — $${totalCost.toFixed(2)} spent. Commit scripts/beautify/scenes/ to lock them in.`);
