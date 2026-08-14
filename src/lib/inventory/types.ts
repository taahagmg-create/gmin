/**
 * Inventory domain model and source contract (brief §3, §8).
 *
 * Everything downstream — listing, teaser grid, vehicle detail, the spin viewer,
 * and eventually the automated tour engine — depends on this shape and nothing
 * else. Swapping where stock comes from (scraped site today, an Autostock feed
 * or a CMS later) means writing one new InventorySource and changing one line.
 */

export type VehicleImage = {
  /** Full-size photo URL. */
  full: string;
  /** Thumbnail variant when the source publishes one. */
  thumb?: string;
};

export type Vehicle = {
  /** Stable id from the source system — Autostock's stock number. */
  id: string;
  /** URL segment for /vehicle/[slug]. Derived, stable, safe. */
  slug: string;
  /** Display title, e.g. "2019 BMW M5". */
  title: string;

  year: number | null;
  make: string;
  model: string;

  /** Null when not published. Check priceOnApplication before showing "—". */
  priceNzd: number | null;
  /**
   * The listing says price on application rather than omitting a price by
   * accident. The UI should invite an enquiry, not render a blank.
   */
  priceOnApplication: boolean;
  odometerKm: number | null;

  transmission: string | null;
  bodyType: string | null;
  exteriorColour: string | null;
  interiorColour: string | null;
  engine: string | null;
  fuelEconomy: string | null;

  images: VehicleImage[];

  /**
   * Every label/value pair the source published, including ones not mapped
   * above. Keeps unexpected fields available to the UI without a schema change,
   * and makes it obvious what a new source is actually providing.
   */
  specs: Record<string, string>;

  /** Where this record came from, for debugging and attribution. */
  sourceUrl: string;
};

/**
 * The subset a listing card needs.
 *
 * Full stock carries ~2,455 image URLs plus every spec; shipping that to the
 * browser to render a grid would be absurd. Server components map to this
 * first, which is roughly one image URL per vehicle instead of eighteen.
 */
export type VehicleCardData = Pick<
  Vehicle,
  | "id"
  | "slug"
  | "title"
  | "year"
  | "make"
  | "model"
  | "priceNzd"
  | "priceOnApplication"
  | "odometerKm"
  | "bodyType"
  | "transmission"
> & { thumb: string | null };

export function toCardData(v: Vehicle): VehicleCardData {
  const first = v.images[0];
  return {
    id: v.id,
    slug: v.slug,
    title: v.title,
    year: v.year,
    make: v.make,
    model: v.model,
    priceNzd: v.priceNzd,
    priceOnApplication: v.priceOnApplication,
    odometerKm: v.odometerKm,
    bodyType: v.bodyType,
    transmission: v.transmission,
    thumb: first ? (first.thumb ?? first.full) : null,
  };
}

export interface InventorySource {
  /** Identifies the implementation in logs and diagnostics. */
  readonly name: string;
  /** Full current stock. */
  listVehicles(): Promise<Vehicle[]>;
  /** A single vehicle, or null when the slug is unknown or the car has sold. */
  getVehicle(slug: string): Promise<Vehicle | null>;
}
