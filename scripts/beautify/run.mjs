import fs from "node:fs";
import path from "node:path";
import { beautifyPhoto, generateScene } from "./pipeline.mjs";

const { createAutostockSource } = await import("@/lib/inventory/autostock.ts");
const { sceneForVehicle, getScene } = await import("@/lib/beautify/scenes.ts");

const listVehicles = () => createAutostockSource().listVehicles();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const LIMIT = Number(value("limit", "0"));
const PHOTOS_PER_VEHICLE = Number(value("photos", "3"));
const OUT_DIR = value("out", "");
const ONLY_SLUGS = args.filter((a, i) => args[i - 1] === "--vehicle");
const FORCE_SCENE = value("scene", "");
const DRY_RUN = flag("dry-run");
const UPLOAD = flag("upload");
const ONLY_NEW = flag("only-new");

const MANIFEST_PATH = path.resolve(import.meta.dirname, "../../src/data/beautify-manifest.json");
const SCENES_DIR = path.resolve(import.meta.dirname, "scenes");
const CONCURRENCY = 2;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && !DRY_RUN) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

function loadLogo() {
  const p = process.env.BEAUTIFY_LOGO_PATH;
  if (!p) {
    console.warn("! BEAUTIFY_LOGO_PATH not set — images will have NO logo overlay.");
    return null;
  }
  if (!fs.existsSync(p)) {
    console.warn(`! logo not found at ${p} — images will have NO logo overlay.`);
    return null;
  }
  if (/\.jpe?g$/i.test(p) && process.env.BEAUTIFY_LOGO_BLEND !== "screen") {
    console.warn(
      "! logo is a JPEG (no alpha). Its background will show as a solid box.\n" +
        "  Set BEAUTIFY_LOGO_BLEND=screen for dark scenes, or supply a transparent PNG/SVG.",
    );
  }
  return {
    buffer: fs.readFileSync(p),
    widthRatio: Number(process.env.BEAUTIFY_LOGO_WIDTH_RATIO ?? "0.16"),
    blend: process.env.BEAUTIFY_LOGO_BLEND ?? "over",
  };
}

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return { version: 1, updatedAt: new Date(0).toISOString(), totalCostUsd: 0, vehicles: {} };
  }
}

/** Load pre-made scene images from scripts/beautify/scenes/ */
function loadStaticScenes() {
  const scenes = {};
  if (!fs.existsSync(SCENES_DIR)) return scenes;
  for (const file of fs.readdirSync(SCENES_DIR)) {
    if (/\.(jpe?g|png)$/i.test(file)) {
      const id = path.basename(file, path.extname(file));
      scenes[id] = fs.readFileSync(path.join(SCENES_DIR, file));
    }
  }
  return scenes;
}

async function upload(buffer, key) {
  const { put } = await import("@vercel/blob");
  const res = await put(key, buffer, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });
  return res.url;
}

async function preflightBlobToken() {
  const { put, del } = await import("@vercel/blob");
  const probe = Buffer.from("probe");
  const res = await put("_beautify-probe.txt", probe, {
    access: "public",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
  await del(res.url);
}

if (UPLOAD) {
  console.log("preflight: testing Blob token…");
  try {
    await preflightBlobToken();
    console.log("  blob token ok");
  } catch (e) {
    console.error(`  blob token FAILED: ${e.message}`);
    console.error("Fix the BLOB_READ_WRITE_TOKEN secret before re-running.");
    process.exit(1);
  }
}

const manifest = loadManifest();
const logo = loadLogo();
const staticScenes = loadStaticScenes();
const useStatic = Object.keys(staticScenes).length > 0;

if (useStatic) {
  console.log(`static scenes loaded: ${Object.keys(staticScenes).join(", ")} (no Gemini cost for backgrounds)`);
} else {
  console.log("no static scenes in scenes/ — will generate one background per vehicle via Gemini");
}

console.log("loading inventory…");
let vehicles = await listVehicles();
console.log(`  ${vehicles.length} vehicles in stock`);

if (ONLY_SLUGS.length > 0) vehicles = vehicles.filter((v) => ONLY_SLUGS.includes(v.slug));
if (ONLY_NEW) vehicles = vehicles.filter((v) => !manifest.vehicles[v.id]);
if (LIMIT > 0) vehicles = vehicles.slice(0, LIMIT);

const jobs = [];
for (const v of vehicles) {
  const scene = FORCE_SCENE ? getScene(FORCE_SCENE) : sceneForVehicle(v.id);
  for (const image of v.images.slice(0, PHOTOS_PER_VEHICLE)) {
    jobs.push({ vehicle: v, scene, source: image.full });
  }
}

const estCost = useStatic ? 0 : vehicles.length * 0.134;
console.log(
  `\n${vehicles.length} vehicles -> ${jobs.length} images` +
    (useStatic ? " (static scenes, $0 Gemini cost)" : ` (~$${estCost.toFixed(2)} for ${vehicles.length} scene generations)`),
);

if (DRY_RUN) {
  for (const v of vehicles.slice(0, 20)) {
    const scene = FORCE_SCENE ? getScene(FORCE_SCENE) : sceneForVehicle(v.id);
    console.log(`  ${v.slug.padEnd(38)} ${scene.id.padEnd(15)} ${v.images.length} photos`);
  }
  console.log("\ndry run — nothing generated, nothing spent.");
  process.exit(0);
}

if (OUT_DIR) fs.mkdirSync(OUT_DIR, { recursive: true });

// Cache generated scenes per vehicle so all photos of one car share a background.
const generatedSceneCache = new Map();

async function getSceneBuffer(scene, vehicleId) {
  if (useStatic && staticScenes[scene.id]) return staticScenes[scene.id];
  const key = `${scene.id}:${vehicleId}`;
  if (!generatedSceneCache.has(key)) {
    console.log(`  generating ${scene.id} scene for ${vehicleId}…`);
    const { buffer } = await generateScene(scene.prompt, apiKey);
    generatedSceneCache.set(key, buffer);
  }
  return generatedSceneCache.get(key);
}

let spent = 0;
let done = 0;
let failed = 0;
let skipped = 0;
const started = Date.now();

async function processJob(job, index) {
  const label = `${job.vehicle.slug} #${index}`;
  try {
    const sceneBuffer = await getSceneBuffer(job.scene, job.vehicle.id);

    const result = await beautifyPhoto({
      sourceUrl: job.source,
      scene: job.scene,
      sceneBuffer,
      apiKey,
      logo,
    });

    if (result.skipped) {
      skipped++;
      console.log(`  skip ${label.padEnd(44)} ${result.reason}`);
      return;
    }

    spent += result.costUsd;
    const base = `vehicles/${job.vehicle.id}-${index}`;

    let fullUrl;
    let thumbUrl;
    if (UPLOAD) {
      fullUrl = await upload(result.full, `${base}.jpg`);
      thumbUrl = await upload(result.thumb, `${base}-thumb.jpg`);
    } else {
      const fullPath = path.join(OUT_DIR || ".", `${job.vehicle.id}-${index}-${job.scene.id}.jpg`);
      fs.writeFileSync(fullPath, result.full);
      const srcPath = path.join(OUT_DIR || ".", `${job.vehicle.id}-${index}-SOURCE.jpg`);
      if (!fs.existsSync(srcPath)) {
        const r = await fetch(job.source, { headers: { "user-agent": "EsteemCarsSite/1.0" } });
        fs.writeFileSync(srcPath, Buffer.from(await r.arrayBuffer()));
      }
      fullUrl = fullPath;
      thumbUrl = undefined;
    }

    const entry = (manifest.vehicles[job.vehicle.id] ??= {
      vehicleId: job.vehicle.id,
      slug: job.vehicle.slug,
      images: [],
    });
    entry.images = entry.images.filter((i) => i.source !== job.source);
    entry.images.push({
      source: job.source,
      full: fullUrl,
      thumb: thumbUrl,
      scene: job.scene.id,
      generatedAt: new Date().toISOString(),
      costUsd: result.costUsd,
    });

    done++;
    console.log(
      `  ok   ${label.padEnd(44)} ${job.scene.id.padEnd(15)} ` +
        `$${spent.toFixed(2)} spent, ${done}/${jobs.length - skipped}`,
    );
  } catch (e) {
    failed++;
    console.log(`  FAIL ${label.padEnd(44)} ${e.message}`);
    if (failed <= 2) console.log(e.stack);
  }
}

let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const i = cursor++;
      await processJob(jobs[i], (i % PHOTOS_PER_VEHICLE) + 1);
    }
  }),
);

manifest.updatedAt = new Date().toISOString();
manifest.totalCostUsd = Number((manifest.totalCostUsd + spent).toFixed(4));
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

const mins = ((Date.now() - started) / 60000).toFixed(1);
console.log(
  `\ndone: ${done} ok, ${skipped} skipped, ${failed} failed, in ${mins} min\n` +
    `spend this run: $${spent.toFixed(2)}   lifetime: $${manifest.totalCostUsd.toFixed(2)}`,
);
process.exit(failed > 0 && done === 0 ? 1 : 0);
