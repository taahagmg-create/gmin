# Esteem Cars

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind scaffold for the Esteem Car
Traders site. Built against `esteem-cars-build.md` — Phase 1 scope, per brief §7.

Every route from brief §3 exists and renders a placeholder listing what still has to be
built on that screen. Nothing is wired to a real integration yet.

> **Deviation from the brief:** §2 specifies Next.js 14. That line stopped receiving security
> patches with unfixed high-severity SSRF and DoS advisories against it, so the scaffold was
> upgraded to Next 16. The App Router architecture the brief is built around is unchanged.

## Getting started

Requires Node.js 20.9+ (Next 16 minimum). Verified on Node 24.19.0 / npm 11.17.0.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. The homepage carries a dev-only route index so you can
click through every page in the scaffold — remove that section before launch.

## Structure

```
src/
  app/
    layout.tsx              Shell: header, footer, sticky CTA slot
    page.tsx                Home — the §4 funnel, section by section
    inventory/              Vehicle listing + search
    vehicle/[slug]/         Vehicle detail — 3D spin + walkthrough
    service-shield/         Ad landing page
    finance/                Standalone finance quiz
    about/                  Story + locations
    contact/                Locations, hours, map
    api/
      leads/                Webhook receiver → Make.com → CRM
      finance-quiz/         Quiz submission handler
      chat/                 Retell AI session handler
  components/
    page-placeholder.tsx    Shared stub — delete per page as it gets built
    site-header.tsx
    site-footer.tsx
  lib/
    integrations.ts         All third-party seams live here
```

## Hero film (brief §4.1)

Built and running with **stock placeholder footage** — Pixabay clips encoded to the timeline's
pacing, not the Service Shield film. Caption timing, the CTA fade, the breakpoint source swap,
unmute and skip are all live. Swapping in the real cut means replacing four files in
`public/hero/`; see [`public/hero/README.md`](public/hero/README.md) for the spec, the as-built
deviations, and why ffmpeg can't run on this machine.

Setting all four `HERO_SOURCES` entries back to `""` returns the hero to a gradient that runs
the identical timeline, with a review strip showing the current beat — useful for checking
pacing without footage.

Pacing is 12s tension → 4s transition → 10s payoff → 4s CTA, matching the shot list. All of it
lives in [`src/lib/hero-timeline.ts`](src/lib/hero-timeline.ts) — beats, captions, CTA reveal,
and the four asset paths. That file is the only thing to touch when the real cut lands.

Desktop (16:9) and mobile (9:16) are separate sources selected via `matchMedia` at the `md`
breakpoint, not one file scaled — only the needed file is fetched, and the element re-keys on
breakpoint change so rotating a phone loads the right cut. See
[`public/hero/README.md`](public/hero/README.md) for the encode spec and ffmpeg commands.

## Finance pre-qualification quiz (brief §4.3, §6)

A slide-over, not a page — it opens over whatever the visitor was looking at so nobody loses
their place in the funnel. Built on a native `<dialog>` with `showModal()`, which supplies
focus trapping, Escape-to-close and background inertness from the platform.

Content and pacing live in [`src/lib/finance-quiz.ts`](src/lib/finance-quiz.ts): the intro
screen, five questions, banded answers, rotating bridge lines, contact fields, and the result
copy. Re-wording or re-ordering the quiz never means touching JSX.

Any CTA can open it via `useFinanceQuiz()`. `PreQualifyCta` is the single component behind the
hero end card, the sticky pill and the offer strip, and every instance carries the same trust
line — no credit check, 30 seconds, free.

**Two constraints that are load-bearing, not stylistic:**

1. The two numeric questions must never react to the value chosen — no praise, no caution, no
   colour change, no helper text keyed to the band. The moment the UI responds to someone's
   income, the quiz becomes an assessment. There is a comment marking this in
   `BandStep`; verified in-browser that the lowest and highest bands render identically.
2. The result screen confirms submission and nothing more. No "pre-qualified", no "likely", no
   odds, no timeline beyond "shortly" — because nothing has actually been assessed at that
   point. `/api/finance-quiz` returns a bare receipt for the same reason.

The full answer set posts to `submitFinanceLead()` as structured fields — employment, banded
income, licence, trade-in plus optional vehicle, banded savings, and contact — so a lead is
useful in the CRM without a second pass. Still stubbed until a webhook URL is set.

### Lead delivery

Leads go to **Marenly, which is Esteem's CRM** — not a third-party broker. `MAREN_API_KEY` is
set in `.env.local`; `submitFinanceLead()` posts there once `MAREN_LEAD_ENDPOINT` is also set,
and falls back to the Make.com webhook otherwise. Both variables are required before anything
is sent, so a key on its own leaves the call stubbed rather than posting to a guessed URL.

Because Marenly is Esteem's own system, the FAQ wording holds as written: details aren't sold,
and nothing reaches a finance provider without telling the customer first. Revisit that copy
only if lead routing ever changes.

### Open before launch

- **The POST mapping is inferred and has never been exercised.** `toMarenlyLead()` maps our
  answers onto Marenly's schema. The contact fields (`caller_name`, `phone_number`,
  `caller_email`) are certain; `call_purpose`, `source`, `previous_context`, `vehicle_interest`
  and `created_at` were inferred from the shape of existing records. No test lead was posted,
  because that writes a real record to a live CRM. **The first genuine submission is the
  test** — watch for it, and confirm the shape with whoever owns Marenly.
- **`finance_preapproved` must never be set by this flow.** Marenly has the field; writing it
  would manufacture an approval that has not happened (§6). `toMarenlyLead()` deliberately
  omits it.
- **The `mk_dev_…` key has read access to production customer PII.** A GET to `/api/leads`
  returns all 316 live records with names, phone numbers and emails. If that key is shared,
  embedded anywhere client-side, or genuinely a dev credential, it is over-scoped for this
  use — the site only ever needs to write.
- **Old Replit URL** (`…kirk.replit.dev`) returned 502 throughout and is superseded by
  `marenly.app`. Not referenced anywhere in the code.
- **The legal disclaimer is an unreviewed draft.** It has not been checked against the CCCFA,
  Fair Trading Act, or Privacy Act. A development-only banner renders on `/finance` while
  `FINANCE_LEGAL_REVIEWED` is `false`; flip it only after a lawyer signs the wording off.

## Chat widget (brief §4.4)

**Live**, running against the Retell "Maren Chat" agent. Bubble, teaser, panel, session-aware
messaging and the "call us instead" fallback all work.

Trigger fires at a random point in the 8–12s window, or 50% scroll depth, whichever lands
first. Dismissal persists for the session so a visitor who said no isn't asked again on every
page. Timing and copy live in [`src/lib/chat.ts`](src/lib/chat.ts).

### Retell wiring

Endpoints were **verified against the live API, not taken from the docs** — the API reference
and `llms.txt` disagree, and the `/v2/*` paths `llms.txt` lists return 404:

```
POST https://api.retellai.com/create-chat            { agent_id }         -> 201 { chat_id }
POST https://api.retellai.com/create-chat-completion  { chat_id, content } -> 200 { messages[] }
```

The completion response mixes the agent's reply with bookkeeping rows (`node_transition`, tool
calls), so only `role === "agent"` is surfaced.

`sendChatMessage()` creates the session on the first message and returns `chatId`, which the
widget echoes back on every subsequent send. Without that the agent would start a new,
amnesiac chat each time.

### Credentials stay server-side

`RETELL_API_KEY` and `RETELL_AGENT_ID` carry **no `NEXT_PUBLIC_` prefix**, so Next never inlines
them into the browser bundle. The widget learns whether chat is live from the `stubbed` flag on
each API response rather than from an env var, so the client needs no knowledge of the
credentials at all. Verified by scanning the built client chunks — no key, agent id, or CRM
host present. Re-run that check if anything in this area changes.

If Retell is unconfigured or errors, the visitor gets a reply that says so plainly and points
at the phone number. Neither fallback ever claims a human has read the message.

Chat is deliberately **not** wired to `submitLead()`. Lead delivery runs against a live
production CRM, and turning chat transcripts into CRM records is a scope decision for a human.

### Phone

`CALL_NUMBER` is set to `+6498734667` / "09 873 4667" — the number Maren answers. It drives the
header click-to-call (both the top bar and the mobile strip) and the chat fallback. If either
field is ever blanked, all phone affordances hide themselves rather than render a half-formed
number.

## Inventory (brief §3, §8)

Stock lives in **Autostock DMS** and is published to esteemcars.co.nz. There is no API to pull
it back out, so the first source implementation reads the published site.

`src/lib/inventory/` is a source-agnostic adapter:

| File | Role |
|---|---|
| `types.ts` | `Vehicle` model and the `InventorySource` contract |
| `autostock.ts` | Reads live stock via the sitemap + detail pages |
| `sample.ts` | Fixed offline data (`INVENTORY_SOURCE=sample`) |
| `index.ts` | Picks the source; `listVehicles()` / `getVehicle(slug)` |

Pages only ever call `listVehicles()` and `getVehicle()`. When Autostock provides a real feed,
add one module and change one switch — no page, component or type moves.

**Measured against live stock:** 133 vehicles in ~9s. 100% coverage on odometer, transmission,
body type, year and images (2,455 photos, ~18.5 per vehicle); 98% on price, the remaining two
being genuine Price On Application, flagged as `priceOnApplication` so the UI can invite an
enquiry rather than render a blank.

Photos come from a stable CDN (`files.autostock.co.nz`, `full` and `thumb` variants) with no
session token, so they can be referenced directly. Rehosting is optional — though §8's tour
pipeline will want local copies eventually.

### Pages

`/inventory` is statically generated with 30-minute revalidation; `/vehicle/[slug]` renders
on demand with the same window, so a build stays fast rather than pre-rendering 133 pages.
An unknown or sold slug 404s — Autostock drops sold stock from the sitemap, which is the
normal end of life for a vehicle page.

Server components map `Vehicle` to `VehicleCardData` before handing data to the client
browser. Full records carry every spec and ~18 image URLs each; the grid needs one image and
six fields, so the payload is a fraction of what it would otherwise be.

Photos go through `next/image` against the allow-listed Autostock CDN. Verified working
locally despite Smart App Control — the image optimiser is unaffected by the policy that
blocks the native SWC binary.

### No 360° spin viewer — confirmed, not deferred

**Esteem has no 360° photo sets.** Only the standard photos already on the current site
(~18.5 per vehicle). The §5 spin viewer and the Phase 1 line item "3D spin viewer for vehicles
(static 360 image sets)" have no source material, so they are struck rather than stubbed —
there is nothing to point a viewer at, and faking rotation from a walk-around photo set looks
worse than a good gallery.

`VehicleGallery` is therefore the permanent vehicle media experience, not a placeholder. It
remains its own component so a real viewer can replace it in place if Esteem ever starts
capturing 360 sets — that is an operational change (rig or app at photography time), not a
development task.

**This also changes §8.** The tour engine's "template-driven" path assumed an existing 360 set
to run a camera move over. That path is unavailable. The brief's own Phase 1 safety net — a
synced slideshow of photos with captions and voiceover — becomes the primary approach rather
than the fallback, and the ~18.5 photos per vehicle are ample for it.

### This is a bridge, not the destination

The pages carry no JSON-LD or schema.org markup, so extraction depends on markup Autostock can
change without warning. Two hazards already found and handled, both of which will recur if the
markup shifts:

- The footer's opening-hours table has the identical `<tr><td>label</td><td>value</td></tr>`
  shape as the spec table, and was landing Monday–Sunday in every vehicle's specs. Parsing is
  now scoped to the striped spec table, excluding `footer_OHrs`.
- Price is read from the finance calculator's raw `value="89990.00"`, with the formatted
  `$89,990` as fallback.

Parsing is deliberately tolerant: a failed page is skipped rather than failing the listing, and
`listVehicles()` returns `[]` rather than throwing if the source is unreachable — an empty
inventory page with a working phone number and chat beats a 500.

**Recommend Esteem ask Autostock for a proper feed or API** ([they advertise custom
integrations](https://dms.autostock.co.nz/integrations.xhtml)). This reader then becomes the
fallback rather than the foundation.

## Integrations

`src/lib/integrations.ts` is the only place that talks to third parties — components call
`submitLead()`, `submitFinanceLead()`, `openChat()`, never a vendor SDK directly (brief §10).

Each function runs in stub mode when its env var is unset: it validates the payload, logs,
and returns `{ ok: true, stubbed: true }` without a network call. Copy `.env.example` to
`.env.local` and fill in a value to switch one over. The API routes work end to end in stub
mode, so the quiz and forms can be built and tested before any credentials exist.

## Not yet installed

Deliberately left out until the screens that need them are built, to keep the scaffold light:

- `three` / `@react-three/fiber` / `@react-three/drei` — the 3D spin viewer (keep it isolated
  as its own component per §10; it's the piece most likely to need replacing)
- Video hosting SDK (Mux or Cloudflare Stream) — decide the host before writing the hero
- CMS client (Sanity or Supabase) — Phase 2, currently no inventory data source

## Dependency security

`npm audit` is clean — 0 vulnerabilities.

The scaffold was originally written against `next@14.2.15` per brief §2. That version carried a
critical (CVSS 9.1) middleware authorization bypass, and the Next 14 line as a whole had
high-severity SSRF and DoS advisories with **no fix available on 14.x** — including SSRF via
WebSocket upgrades (CVSS 8.6) and SSRF in rewrites, both fixed only in 15.5.x+. For a
production site taking paid ad traffic and collecting finance leads, shipping that was not
sensible, so the project moved to Next 16. Re-run `npm audit` before each release.

## Build: webpack, not Turbopack

`dev` and `build` both pass `--webpack`. Next 16 defaults to Turbopack, which requires the
native `@next/swc` binary; on a Windows machine with **Smart App Control enforced** that `.node`
file is blocked, Next falls back to WASM bindings, and Turbopack cannot run on WASM. Webpack
can, so the build works — just slower.

This is a local-machine constraint, not a project one. On CI, Vercel, or any machine where the
native binary loads, drop the `--webpack` flags to get the faster Turbopack path.

## Generated agent files

`next dev` writes `AGENTS.md` and `CLAUDE.md` automatically and re-creates them if deleted.
Set `agentRules: false` in `next.config.mjs` to turn this off.

## Compliance

Brief §6 carries a live flag: finance copy must stay at "check your options" / "likely" and
must never imply guaranteed approval or a specific rate ahead of lender assessment. Needs
legal review against NZ Fair Trading Act rules before the quiz goes live. `/api/finance-quiz`
returns intentionally soft copy for this reason.

## Open questions from the brief

- Which system does Esteem's stock actually flow through? (§8 — drives the ingest trigger)
- ~~Which CRM receives leads?~~ Answered: Marenly. Endpoint details still outstanding.
- Lender API availability vs. staying on a stubbed webhook for launch (§9)
