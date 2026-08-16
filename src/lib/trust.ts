/**
 * Trust strip data — sourced and verified from esteemcars.co.nz and Google
 * Business Profile, 2026-08-15.
 *
 * Review counts go stale. If a live Google Places widget is wired up later,
 * these become the fallback / SSR seed.
 */

const takanini = { rating: 5.0, count: 183 };
const newLynn = { rating: 4.8, count: 373 };

const total = takanini.count + newLynn.count;
const weighted =
  (takanini.rating * takanini.count + newLynn.rating * newLynn.count) / total;

export const REVIEWS = {
  takanini,
  newLynn,
  combined: { rating: Math.round(weighted * 10) / 10, count: total },
};

export type FinancePartner = {
  name: string;
  url: string;
};

export const FINANCE_PARTNERS: FinancePartner[] = [
  { name: "Avanti Finance", url: "https://www.avantifinance.co.nz" },
  { name: "CFS Finance", url: "https://www.cfsfinance.co.nz" },
  { name: "Geneva Finance", url: "https://genevafinance.co.nz" },
  { name: "Oxford Finance", url: "https://www.oxfordfinance.co.nz" },
];

export const PROOF_POINTS = [
  {
    label: "Family-owned, 10+ years",
    detail: "Two yards in South and West Auckland, same family behind the counter since day one.",
  },
  {
    label: "Every car inspected",
    detail:
      "Hand-selected stock, each one through a multi-point mechanical check before it goes on the lot.",
  },
  {
    label: "Nationwide delivery",
    detail:
      "Can’t make it to Auckland? They’ll get the car to you, or cover your flight down to pick it up.",
  },
];
