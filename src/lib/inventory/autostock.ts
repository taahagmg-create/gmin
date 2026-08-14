import type { InventorySource, Vehicle, VehicleImage } from "@/lib/inventory/types";

/**
 * Reads current stock from Esteem's existing Autostock-published website.
 *
 * Autostock (Payara/JSF) publishes stock to esteemcars.co.nz and maintains a
 * sitemap of every vehicle page, which gives us an authoritative, always-current
 * stock list for free. robots.txt permits crawling (`Disallow:` empty).
 *
 * This is a BRIDGE, not the destination. The pages carry no JSON-LD or
 * schema.org markup, so extraction depends on markup Autostock can change
 * without notice. The durable answer is a real feed or API from Autostock —
 * when that exists, write a new InventorySource and leave this one as fallback.
 *
 * Parsing is deliberately tolerant: a vehicle missing a price or an odometer
 * still appears, with nulls. One unparseable page never takes down the listing.
 */

const ORIGIN = "https://esteemcars.co.nz";
const SITEMAP = `${ORIGIN}/sitemap.xml`;

/** How long fetched pages stay cached. Stock turns over monthly (§8). */
const REVALIDATE_SECONDS = 1800;

/** Identify ourselves honestly rather than impersonating a browser. */
const USER_AGENT = "EsteemCarsSite/1.0 (+https://esteemcars.co.nz)";

/** Concurrent detail fetches — enough to be quick, low enough to be polite. */
const CONCURRENCY = 6;

type SitemapEntry = {
  id: string;
  slug: string;
  year: number | null;
  make: string;
  model: string;
  url: string;
};

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .trim();
}

/** Makes that look wrong in the title case the URL uses ("Bmw" → "BMW"). */
const ACRONYMS: Record<string, string> = {
  bmw: "BMW",
  vw: "VW",
  gmc: "GMC",
  mg: "MG",
  byd: "BYD",
  ldv: "LDV",
};

function tidyMake(raw: string): string {
  return ACRONYMS[raw.toLowerCase()] ?? raw;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Vehicle URLs look like /vehicle/6764/2019-Bmw-M5 — and the tail may contain
 * spaces ("2011-Subaru-Impreza Wrx Sti A Line"), so it is decoded before use.
 */
function parseVehicleUrl(url: string): SitemapEntry | null {
  const m = /\/vehicle\/(\d+)\/(.+)$/.exec(url);
  if (!m) return null;

  const id = m[1];
  const tail = decodeURIComponent(m[2]).trim();
  const parts = tail.split("-");

  const yearNum = Number(parts[0]);
  const year = Number.isFinite(yearNum) && yearNum > 1900 ? yearNum : null;
  const make = tidyMake(parts[1] ?? "");
  const model = parts.slice(2).join("-").trim();

  return {
    id,
    slug: `${id}-${toSlug(tail)}`,
    year,
    make,
    model,
    url,
  };
}

async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const xml = await get(SITEMAP);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs
    .map(parseVehicleUrl)
    .filter((e): e is SitemapEntry => e !== null);
}

/**
 * Specs live in a plain <tr><td>Label</td><td>Value</td></tr> table. Every pair
 * is captured, including ones we don't map, so a new field appearing upstream
 * is visible rather than silently dropped.
 */
function parseSpecTable(html: string): Record<string, string> {
  const specs: Record<string, string> = {};

  /*
   * Scoped to the vehicle spec tables. The page footer carries an opening-hours
   * table (class "footer_OHrs") with an identical <tr><td>label</td><td>value
   * </td></tr> shape, which otherwise lands Monday–Sunday in the spec map.
   * Prefer the striped spec table; fall back to any non-footer table so a class
   * rename upstream degrades rather than breaks.
   */
  const tables = [...html.matchAll(/<table([^>]*)>([\s\S]*?)<\/table>/gi)].filter(
    (m) => !/footer_OHrs/i.test(m[1]),
  );
  const striped = tables.filter((m) => /table-striped/i.test(m[1]));
  const chosen = (striped.length > 0 ? striped : tables).map((m) => m[2]);

  for (const table of chosen) {
    const rows = table.matchAll(
      /<tr[^>]*>\s*<td[^>]*>([\s\S]{1,60}?)<\/td>\s*<td[^>]*>([\s\S]{1,200}?)<\/td>/g,
    );
    for (const row of rows) {
      const key = decodeEntities(row[1].replace(/<[^>]+>/g, ""));
      const value = decodeEntities(row[2].replace(/<[^>]+>/g, ""));
      if (key && value && !specs[key]) specs[key] = value;
    }
  }

  return specs;
}

/** Distinguishes "price on application" from a price we simply failed to read. */
function parsePriceOnApplication(html: string): boolean {
  return /P\.?O\.?A\.?\b|price on application|enquire for price/i.test(html);
}

/**
 * Price is most reliable as the raw numeric on the finance calculator input
 * ("89990.00"); the formatted "$89,990" elsewhere is the fallback.
 */
function parsePrice(html: string): number | null {
  const labelIndex = html.indexOf("Vehicle price");
  if (labelIndex >= 0) {
    const after = html.slice(labelIndex, labelIndex + 1200);
    const raw = /value="(\d+(?:\.\d+)?)"/.exec(after);
    if (raw) {
      const n = Number(raw[1]);
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  const formatted = /\$\s?([\d,]{4,})/.exec(html);
  if (formatted) {
    const n = Number(formatted[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseOdometer(specs: Record<string, string>): number | null {
  const raw = specs["Odometer"] ?? specs["Odometer Reading"] ?? specs["Mileage"];
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Photos are on a stable CDN (files.autostock.co.nz) in `full` and `thumb`
 * variants — no session token, so they can be referenced directly. UI chrome is
 * served from JSF resource paths and is excluded.
 */
function parseImages(html: string): VehicleImage[] {
  const srcs = [...html.matchAll(/<img[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
  const photos = srcs.filter((s) => s.includes("files.autostock.co.nz") && s.includes("/vehicles/"));

  const fulls = photos.filter((s) => s.includes("/full/"));
  const thumbs = photos.filter((s) => s.includes("/thumb/"));

  const byId = (u: string) => u.split("/").pop() ?? u;
  const thumbFor = (fullUrl: string) => thumbs.find((t) => byId(t) === byId(fullUrl));

  const seen = new Set<string>();
  const images: VehicleImage[] = [];
  for (const full of fulls) {
    if (seen.has(full)) continue;
    seen.add(full);
    images.push({ full, thumb: thumbFor(full) });
  }

  // Some records publish thumbnails only.
  if (images.length === 0) {
    for (const t of thumbs) {
      if (seen.has(t)) continue;
      seen.add(t);
      images.push({ full: t });
    }
  }

  return images;
}

function buildVehicle(entry: SitemapEntry, html: string): Vehicle {
  const specs = parseSpecTable(html);
  const priceNzd = parsePrice(html);

  const make = specs["Make"] ? tidyMake(specs["Make"]) : entry.make;
  const model = specs["Model"] ?? entry.model;
  const title = [entry.year, make, model].filter(Boolean).join(" ").trim();

  return {
    id: entry.id,
    slug: entry.slug,
    title: title || `${make} ${model}`.trim(),
    year: entry.year,
    make,
    model,
    priceNzd,
    priceOnApplication: priceNzd === null && parsePriceOnApplication(html),
    odometerKm: parseOdometer(specs),
    transmission: specs["Transmission"] ?? null,
    bodyType: specs["Body"] ?? specs["Body Type"] ?? null,
    exteriorColour: specs["Ext Colour"] ?? specs["Exterior Colour"] ?? null,
    interiorColour: specs["Interior"] ?? specs["Int Colour"] ?? null,
    engine: specs["Engine"] ?? null,
    fuelEconomy: specs["Fuelsaver"] ?? specs["Fuel Economy"] ?? null,
    images: parseImages(html),
    specs,
    sourceUrl: entry.url,
  };
}

/** Runs tasks with a bounded number in flight. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results.push(await task(items[index]));
    }
  });

  await Promise.all(workers);
  return results;
}

export function createAutostockSource(): InventorySource {
  return {
    name: "autostock-sitemap",

    async listVehicles() {
      const entries = await fetchSitemapEntries();

      const settled = await pool(entries, CONCURRENCY, async (entry) => {
        try {
          return buildVehicle(entry, await get(entry.url));
        } catch (e) {
          // One bad page must not take down the whole listing.
          console.warn(`[inventory] skipped ${entry.url}:`, e instanceof Error ? e.message : e);
          return null;
        }
      });

      return settled
        .filter((v): v is Vehicle => v !== null)
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    },

    async getVehicle(slug: string) {
      const entries = await fetchSitemapEntries();
      const entry = entries.find((e) => e.slug === slug);
      if (!entry) return null;

      try {
        return buildVehicle(entry, await get(entry.url));
      } catch (e) {
        console.warn(`[inventory] detail failed for ${slug}:`, e instanceof Error ? e.message : e);
        return null;
      }
    },
  };
}
