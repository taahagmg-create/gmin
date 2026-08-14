import type { SceneId } from "@/lib/beautify/scenes";

/**
 * The manifest is the contract between the pipeline and the website.
 *
 * The pipeline (GitHub Actions) writes it. The decorating inventory source
 * reads it and swaps image URLs. Neither knows anything else about the other,
 * so the pipeline can be rewritten, moved, or run anywhere without the site
 * changing.
 */

export type BeautifiedImage = {
  /** The original Autostock CDN URL this was derived from — the join key. */
  source: string;
  /** Where the finished image lives (Vercel Blob / R2 / S3). */
  full: string;
  /** Smaller variant for cards, when produced. */
  thumb?: string;
  scene: SceneId;
  /** ISO timestamp of generation, for staleness checks and reruns. */
  generatedAt: string;
  /** Actual USD cost of the generation call, summed for reporting. */
  costUsd: number;
};

export type BeautifiedVehicle = {
  vehicleId: string;
  slug: string;
  images: BeautifiedImage[];
};

export type BeautifyManifest = {
  version: 1;
  updatedAt: string;
  /** Running total across every run, so spend is observed rather than assumed. */
  totalCostUsd: number;
  vehicles: Record<string, BeautifiedVehicle>;
};

export const EMPTY_MANIFEST: BeautifyManifest = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  totalCostUsd: 0,
  vehicles: {},
};

/** Flat lookup from original URL to finished image, for the decorating source. */
export function indexBySource(manifest: BeautifyManifest): Map<string, BeautifiedImage> {
  const index = new Map<string, BeautifiedImage>();
  for (const vehicle of Object.values(manifest.vehicles)) {
    for (const image of vehicle.images) index.set(image.source, image);
  }
  return index;
}
