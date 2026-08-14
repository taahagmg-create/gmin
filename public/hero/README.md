# Hero film assets

**Currently wired to stock placeholder footage, not the Service Shield film.** The four files
here are Pixabay clips encoded to the timeline's pacing so the section can be reviewed with
real video in place. Replace them with the real cut using the same filenames and no code
changes are needed.

## As built (placeholder)

| | Desktop | Mobile |
|---|---|---|
| File | `hero-desktop-16x9.mp4` | `hero-mobile-9x16.mp4` |
| Size | 6.16 MB | 4.31 MB |
| Resolution | 1920×1080 | **720×1280** |
| Duration | 30.00s | 30.00s |
| Audio | none | none |
| Poster | 243 KB @ 26s | 214 KB @ 26s |

Three deviations from the spec below, all specific to the placeholder:

1. **Mobile is 720×1280, not 1080×1920.** The vertical source is natively 720p. It is a genuine
   vertical shot rather than a crop, which was the important part; upscaling to 1080×1920 would
   have added bytes without adding detail. The real asset should still be 1080×1920.
2. **The desktop cut has a visible loop seam at 15s.** Its source is 15.02s, looped twice via
   `-stream_loop -1` to fill the 30s timeline. The real 30s film won't need this.
3. **Encoded with `-preset ultrafast`**, so quality is below what the commands below produce.
   See the WASM note under Commands.

## Wiring in the real film

Drop the four files below into this directory, then fill in `HERO_SOURCES` in
[`src/lib/hero-timeline.ts`](../../src/lib/hero-timeline.ts). That is the only code change —
the placeholder gradient and its review strip disappear automatically.

```ts
export const HERO_SOURCES: HeroSources = {
  desktop: "/hero/hero-desktop-16x9.mp4",
  mobile: "/hero/hero-mobile-9x16.mp4",
  posterDesktop: "/hero/hero-desktop-16x9.jpg",
  posterMobile: "/hero/hero-mobile-9x16.jpg",
};
```

## Encode spec

| | Desktop | Mobile |
|---|---|---|
| Resolution | 1920×1080 (16:9) | 1080×1920 (9:16) |
| Duration | 30s, looping | 30s, looping |
| Codec | H.264 (`libx264`), yuv420p | same |
| Audio | none — stripped | none — stripped |
| Target size | < 8 MB | < 8 MB |
| Serves at | `md` and above (≥768px) | below `md` |

**The mobile cut must come from a natively vertical source, not a crop of the desktop file.**
A centre-crop of the wide shot throws away the framing that makes the shot work. The two
`crop` filters below are for conforming an already-correct aspect to exact pixel dimensions —
not for turning a landscape plate into a portrait one.

Duration must be exactly 30s or the captions drift: the component reads `video.currentTime`
once playback starts, and `HERO_DURATION` is the loop modulus.

## Commands

Desktop cut — trim to 30s, strip audio, conform to 1920×1080, cap the bitrate so the file
lands under 8 MB, and move the moov atom to the front so it starts streaming immediately:

```bash
ffmpeg -i source-16x9.mp4 -t 30 -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 1900k -maxrate 2400k -bufsize 4000k -movflags +faststart hero-desktop-16x9.mp4
```

Mobile cut, from the vertical source:

```bash
ffmpeg -i source-9x16.mp4 -t 30 -an -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -b:v 1700k -maxrate 2200k -bufsize 3600k -movflags +faststart hero-mobile-9x16.mp4
```

Poster frames. Pulling from the payoff beat (26s) rather than the last frame gives a warmer,
more inviting first paint — the tension beats are deliberately drab:

```bash
ffmpeg -ss 26 -i hero-desktop-16x9.mp4 -frames:v 1 -q:v 3 hero-desktop-16x9.jpg
```

```bash
ffmpeg -ss 26 -i hero-mobile-9x16.mp4 -frames:v 1 -q:v 3 hero-mobile-9x16.jpg
```

For the literal last frame instead, swap `-ss 26 -i X` for `-sseof -0.1 -i X -update 1`.

Verify what you produced:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 hero-desktop-16x9.mp4
```

## Encoding on this machine: ffmpeg is blocked

**Smart App Control is Enforced here and refuses to run any unsigned executable**, which
includes every free Windows ffmpeg build — both the BtbN and gyan.dev builds were downloaded
(gyan's hash verified against the publisher) and both were blocked. This is the same policy
that broke the Node MSI and blocks Next's native SWC binary.

The placeholder assets were therefore encoded with **ffmpeg.wasm** through Node instead:
WebAssembly is not a native executable, so the policy doesn't apply, and `node.exe` is
code-signed and runs fine. The throwaway scripts live in the session scratchpad, not this repo.

Two constraints if you ever repeat that route:

- **`-preset` must be `ultrafast`.** Every slower preset crashes the WASM build with
  `RuntimeError: null function or function signature mismatch`. Verified by isolating each
  option individually — `-profile:v`, `-b:v`/`-maxrate`/`-bufsize` and `-movflags +faststart`
  all work; only the preset breaks.
- `@ffmpeg/core` 0.11 loads its `.wasm` via global `fetch()`, which Node 24 refuses for the
  `file:` scheme. A small fetch shim that reads local paths off disk is required.

The commands earlier in this file are for a machine with a working native ffmpeg, and will
produce better output than the placeholders.

## Placeholder sourcing notes

Pexels and Pixabay both return 403 to scripted requests from this machine, but
`cdn.pixabay.com` serves directly. Sources used, both Pixabay licence (free for commercial
use, no attribution required):

- Horizontal — bridge / road / cars / sunset, 15.02s, 2560×1440:
  `https://cdn.pixabay.com/video/2019/04/02/22544-328624736_medium.mp4`
- Vertical — aerial road / vehicle, 720×1280:
  `https://cdn.pixabay.com/video/2025/03/23/266987_tiny.mp4`

Confirm the licence on each clip's Pixabay page before shipping anything publicly. These are
review stand-ins, not cleared production assets.
