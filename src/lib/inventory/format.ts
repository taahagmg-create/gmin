/**
 * Display helpers for inventory values.
 *
 * Price deliberately distinguishes three states — a figure, price on
 * application, and genuinely unknown — because rendering a blank for a car the
 * dealership is happy to quote on loses a sale.
 */

export function formatPrice(v: {
  priceNzd: number | null;
  priceOnApplication: boolean;
}): string {
  if (v.priceNzd !== null) return `$${v.priceNzd.toLocaleString("en-NZ")}`;
  if (v.priceOnApplication) return "Enquire for price";
  return "Price on request";
}

export function formatOdometer(km: number | null): string {
  return km === null ? "—" : `${km.toLocaleString("en-NZ")} km`;
}

/** Price bands for filtering. Upper bound is exclusive; null means open-ended. */
export const PRICE_BANDS = [
  { id: "any", label: "Any price", min: null, max: null },
  { id: "under-10", label: "Under $10k", min: null, max: 10000 },
  { id: "10-20", label: "$10k – $20k", min: 10000, max: 20000 },
  { id: "20-30", label: "$20k – $30k", min: 20000, max: 30000 },
  { id: "30-50", label: "$30k – $50k", min: 30000, max: 50000 },
  { id: "50-plus", label: "$50k+", min: 50000, max: null },
] as const;

export type PriceBandId = (typeof PRICE_BANDS)[number]["id"];

export const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "odometer-asc", label: "Lowest kilometres" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];
