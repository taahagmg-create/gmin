# Photo beautification pipeline

Replace the background of vehicle photos with a premium showroom setting. **The car itself is
never altered** — that guarantee comes from compositing the original pixels back over the
generated scene, not from asking the model nicely.

Status: **design only — not built.** Blocked on three items, see the end.

---

## The guarantee, precisely

There is a meaningful difference between two approaches that are easy to conflate:

| | What happens to the car |
|---|---|
| **Image edit** — send the photo, prompt "don't change the car" | The car passes *through* the generative model. It usually survives intact. "Usually" is doing a lot of work across 400 images. |
| **Segment → generate → composite** | The car's pixels never enter the model's output path. Byte-identical by construction. |

The brief specifies the second, and that is what this design does. The prompt's "do not alter
the vehicle" clause is retained as belt-and-braces for lighting and perspective coherence —
**not** as the mechanism that protects the car.

### Two input variants worth A/B-ing in the test batch

- **A — condition on the full photo.** Send the original; the model returns a scene *with* its
  own rendering of the car, which we discard and overwrite with the untouched crop. Better
  lighting and perspective match, because the model can see the vehicle. Small risk of the
  model's car bleeding at the mask edge if the mask is imperfect.
- **B — condition on the masked photo.** Cut the car out first and send the hole. No bleed risk
  at all, and we aren't paying to render a car we throw away. The model has less context for
  matching light direction to the car's existing highlights.

Recommendation: run both on the same 3–4 vehicles and compare. The dark car will separate them.

### Test 1 result: variant A is dead

One real image was put through `gemini-3-pro-image` using the briefed prompt (2019 BMW M5,
white, full photo in, 38s, ~$0.13).

The showroom it produced is genuinely premium. **It also regenerated the car**, despite the
prompt's explicit pixel-for-pixel instruction:

| | Source | Output |
|---|---|---|
| Dimensions | 1024 × 768 | 1195 × 896 |
| Framing | body cropped at right edge | whole car in frame, repositioned and rescaled |
| Wheels | front wheel only, blue calipers | rear wheel now visible, spokes re-rendered |

So the prompt's "do not alter the vehicle" clause does not hold, which is exactly why the
guarantee has to come from the composite.

There is a second, less obvious consequence. Because the model **re-poses** the car, the
shadow, floor reflection and light falloff in its output are all built around *its* placement
of the vehicle. Pasting the original crop back over that image would drop the real car next to
a shadow belonging to a car that isn't there any more.

**Therefore:**

- Variant A (condition on the full photo, keep the model's scene) is unusable — not just risky.
- The scene must be generated **car-free**, and the shadow and reflection must be synthesised in
  code from the mask's contact line, so they belong to the actual vehicle.
- The three prompts above need their "do not alter the vehicle" clauses replaced with empty-set
  descriptions ("an empty showroom floor, no vehicle present, clear foreground space").

That is more code, but it is the only version where the pixel-identical guarantee is real
rather than asserted.

### Where quality actually lives

Not in the prompt — in the **mask edge**. Glass, wheel spokes, aerials, and roof rails are
where cheap segmentation fails, and dark cars against dark backgrounds are the hardest case.
This is why the test batch must include a black vehicle (correct instinct in the brief).

The synthetic shadow/reflection pass matters nearly as much: a perfectly cut car with no
contact shadow reads as a sticker.

---

## Prompt variations

All 133 vehicles in one identical room is its own kind of AI tell. Three scenes, assigned
deterministically by vehicle id so a given car always renders the same way.

### 1. Signature dark showroom (as briefed)

> Replace only the background of this photo with a premium car showroom setting: dark, glossy
> reflective floor, dramatic directional overhead lighting with visible light beams, a subtle
> dark gradient backdrop (charcoal to black), soft ambient rim lighting on the vehicle's edges.
> Add a realistic soft shadow and floor reflection beneath the vehicle consistent with the
> lighting direction. Do not alter, regenerate, retouch, or modify the vehicle itself in any
> way — preserve its exact color, body panels, wheels, badges, reflections on the paint, and
> every detail pixel-for-pixel. Only the environment around the car should change.
> Photorealistic, not stylized or illustrated. High detail, natural lighting physics, no
> artificial glow or oversaturation.

### 2. Neutral grey studio

> Replace only the background of this photo with a clean professional photography studio: a
> seamless light grey cyclorama wall curving into a matte pale grey floor, even diffused
> softbox lighting from above and slightly front-left, no visible light sources or fixtures in
> frame. Add a soft realistic contact shadow beneath the vehicle and a very subtle floor
> sheen consistent with a matte surface. Do not alter, regenerate, retouch, or modify the
> vehicle itself in any way — preserve its exact color, body panels, wheels, badges, and paint
> reflections pixel-for-pixel. Only the environment around the car should change.
> Photorealistic commercial product photography, neutral colour balance, no stylization, no
> oversaturation.

Best for dark and black vehicles: the tonal separation flatters them where the dark showroom
can swallow the silhouette.

### 3. Architectural daylight

> Replace only the background of this photo with a modern architectural forecourt: smooth
> polished concrete ground, a clean minimal building edge and glazing softly out of focus
> behind, overcast diffused daylight with soft directional shadows, gentle cool-neutral colour
> temperature. Add a realistic soft shadow beneath the vehicle consistent with overhead
> diffused light, and a faint damp-concrete reflection. Do not alter, regenerate, retouch, or
> modify the vehicle itself in any way — preserve its exact color, body panels, wheels, badges,
> and paint reflections pixel-for-pixel. Only the environment around the car should change.
> Photorealistic, natural daylight physics, no HDR look, no oversaturation.

**If input variant B is chosen** (masked input), these prompts need rewriting to describe an
*empty* scene with a vacant floor area — instructing a model not to alter a car that isn't in
the frame produces confused output.

---

## How output reaches the site

Constraint: no changes to the pages, `VehicleCard`, or the gallery.

That is achievable with **zero changes to the `Vehicle` type or any page**, by adding a
decorating source rather than a new field:

```
createBeautifiedSource(createAutostockSource())
```

The wrapper calls through to the inner source, then rewrites each vehicle's `images` to point
at beautified assets wherever the manifest has them, falling back to the original URL where it
doesn't. Everything downstream — listing, detail, cards, gallery, OG images — picks it up
without knowing anything happened.

The manifest is a generated JSON map:

```
{ "<original CDN url>": { "full": "/vehicles/enhanced/<id>-1.jpg", "scene": "dark-showroom" } }
```

This also satisfies "hook into the ongoing pipeline": whatever later watches Autostock for new
stock writes new manifest entries, and the wrapper serves them automatically.

---

## Built — how to run it

| Piece | Path |
|---|---|
| Scene prompts | `src/lib/beautify/scenes.ts` |
| Manifest contract | `src/lib/beautify/types.ts`, `src/data/beautify-manifest.json` |
| Site integration | `src/lib/inventory/beautified.ts` (decorating source) |
| Pipeline | `scripts/beautify/pipeline.mjs` |
| Batch runner | `scripts/beautify/run.mjs` |
| Backfill / test runs | `.github/workflows/beautify.yml` |
| New-stock detection | `src/app/api/cron/beautify/route.ts` + `vercel.json` |

### Secrets and variables

GitHub repository **secrets**: `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`.
GitHub repository **variables** (once a usable logo exists): `BEAUTIFY_LOGO_PATH`,
`BEAUTIFY_LOGO_BLEND`.
Vercel environment: `CRON_SECRET`, `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPOSITORY`.

### The test batch

Actions → *Beautify vehicle photos* → Run workflow → mode `test`, limit `4`. It writes to an
artifact instead of publishing, and saves each source photo beside its result for direct
comparison. **Pick a black vehicle among the four** — dark cars are where segmentation fails.

`--dry-run` lists what would run and the estimated spend without calling the API at all.

### Two things the code guards

**The car is never resampled.** The canvas is the source photo's exact dimensions, the generated
scene is resized to fit *that*, and the cutout is composited at (0,0) at native size. The
pipeline throws if segmentation returns different dimensions, rather than scaling the car to fit.

**The pipeline reads pristine sources.** It imports `createAutostockSource()` directly, never
`@/lib/inventory`, because the latter now returns *beautified* URLs — feeding those back in
would beautify already-beautified photos on every rerun.

## Cost model

Confirmed pricing: **`gemini-3-pro-image`** (Nano Banana Pro), $0.134 per 1K/2K image, $0.24 at
4K.

| Scope | Images | At $0.134 | At $0.24 |
|---|---|---|---|
| Test batch (4 cars × 3) | 12 | $1.61 | $2.88 |
| Test batch, both variants | 24 | $3.22 | $5.76 |
| Full run (133 × 3) | 399 | $53.47 | $95.76 |

Matches the brief's $54–$96 estimate. Actual spend is logged per image as the batch runs
rather than assumed.

---

## Status

| Item | State |
|---|---|
| Gemini API key | ✅ valid, `?key=` query auth |
| `gemini-3-pro-image` | ✅ available to this key |
| Generation quality | ✅ excellent scene, ❌ does not preserve the car — see Test 1 |
| Esteem logo | ⚠️ supplied, RGBA with alpha, but only **277 × 134 px** |
| Segmentation runtime | ❌ unproven |
| Compositing runtime | ❌ `sharp` is blocked on this machine |

### Logo assets — neither is usable as-is

Two files supplied, each failing in the opposite direction:

| File | Size | Alpha | Problem |
|---|---|---|---|
| `logo.png.png` | 277 × 134 | ✅ true RGBA | Too small — needs scaling past native resolution, giving soft, scale-dependent edges |
| `WhatsApp Image …11.16.54 AM.jpeg` | 1080 × 1080 | ❌ JPEG cannot carry alpha | Black background baked in |

The JPEG is also a *different lockup* — square, with the "Where Peace Of Mind Is Delivered"
tagline — where the PNG is a horizontal mark without it. For a corner watermark on a landscape
photo the horizontal lockup is usually the right one.

**An SVG would solve both problems at once.** Failing that, a transparent PNG ≥ 800px wide.

Two workarounds exist if the SVG cannot be found, both with caveats:

- **Key out the black.** The mark is white and blue on pure black, so a luminance key is clean
  in principle — but JPEG compression leaves grey halos around the edges, which would be
  visible against the light-grey studio scene.
- **Screen/lighten blend.** Compositing the black-backed logo in `screen` mode makes black
  disappear entirely. Works beautifully on the dark showroom scene and fails on the grey studio
  and daylight scenes.

Either workaround would let the **dark showroom scene** ship now, with the other two scenes
waiting on a proper asset.

## The runtime problem

This is now the main obstacle, and it is bigger than first thought.

- `rembg` and Segment Anything are Python. **Python is not installed** — the `python3` on PATH
  is the Microsoft Store alias stub, and there is no `pip`.
- Both depend on native ML runtimes (ONNX Runtime, PyTorch).
- **`sharp` — the intended compositing engine — is also blocked**, confirmed:
  `ERR_DLOPEN_FAILED: An Application Control policy has blocked this file`.

That makes **five** native binaries Smart App Control has blocked in this project: the Node MSI's
custom action DLL, two separate ffmpeg builds, Next's native SWC module, and now sharp.

### Can this run on Vercel?

**Not the backfill. Yes for the ongoing trickle.** They are different jobs and should be split.

The 133-vehicle backfill is ~399 images at ~38s each — about 4.2 hours sequential, and roughly
30–40 minutes even at concurrency 8. Three separate Vercel limits rule it out:

1. **Function duration.** Vercel Functions cap in the hundreds of seconds (300s on Pro by
   default, higher with Fluid compute). Nothing reaches half an hour.
2. **No persistent filesystem.** Only `/tmp`, a few hundred MB, wiped per invocation. The run
   produces roughly 200 MB of images that need somewhere permanent to live.
3. **The build step is the wrong lever.** Builds cap around 45 minutes, and anything done there
   re-runs on *every deploy* — so each deploy would spend half an hour regenerating images that
   have not changed, and pay for them again.

The **incremental** case fits Vercel comfortably: one new vehicle is ~3 images, about two
minutes of work. A cron job diffs the Autostock sitemap against the manifest, and a function
processes just the new stock. That is exactly the "hook into the ongoing pipeline" requirement.

| Job | Where | Why |
|---|---|---|
| Backfill (399 images, one-off) | GitHub Actions or any Linux box | 6h timeout, native `sharp`/`rembg`, no SAC |
| New stock (~3 images per vehicle) | Vercel cron + function | Well inside duration limits |

### Storage: not the repo

~200 MB of generated images does not belong in git, and would bloat every Vercel deploy. Put
them in **Vercel Blob** (or R2/S3) and have the manifest hold URLs. The decorating inventory
source only ever swaps one URL for another, so it does not care where they live.

### Recommendation: don't run this on the dev machine

This is an **offline batch job that produces static assets**. Nothing about it needs to run on
this laptop, or inside the Next app. Run it in a Linux container or CI job and `rembg`, `sharp`
and ONNX all simply work, with no WASM workarounds for each blocked dependency in turn.

The alternative — WASM segmentation via `onnxruntime-web` plus a pure-JS compositor such as
`jimp` — is viable in principle, since ffmpeg.wasm did run here. But it means fighting the same
policy at every step, with worse performance, for a job that runs a few hundred times and then
mostly idles.

Either way the output is the same: generated images plus a manifest, consumed by the decorating
inventory source.
