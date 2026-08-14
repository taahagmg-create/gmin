import type { InventorySource, Vehicle } from "@/lib/inventory/types";
import type { BeautifyManifest } from "@/lib/beautify/types";
import { indexBySource } from "@/lib/beautify/types";
import manifestJson from "@/data/beautify-manifest.json";

/**
 * Wraps any inventory source and swaps in beautified photos where they exist.
 *
 * This is the entire integration surface. Pages, VehicleCard, the gallery, the
 * Vehicle type and the card mapper are all untouched — they receive vehicles
 * whose `images` simply point somewhere better. A vehicle with no beautified
 * images passes through unchanged, so the site is never worse than the source.
 *
 * The manifest is committed to the repo (small, versioned, reviewable); the
 * images themselves live in blob storage (large, not versioned).
 */

const manifest = manifestJson as BeautifyManifest;

export function createBeautifiedSource(inner: InventorySource): InventorySource {
  const bySource = indexBySource(manifest);

  // Nothing generated yet, or explicitly disabled — don't add a layer that
  // does nothing but cost a map lookup per image.
  if (bySource.size === 0 || process.env.BEAUTIFY_IMAGES === "off") {
    return inner;
  }

  const decorate = (vehicle: Vehicle): Vehicle => ({
    ...vehicle,
    images: vehicle.images.map((image) => {
      const better = bySource.get(image.full);
      if (!better) return image;
      return { full: better.full, thumb: better.thumb ?? better.full };
    }),
  });

  return {
    name: `${inner.name}+beautified`,
    async listVehicles() {
      return (await inner.listVehicles()).map(decorate);
    },
    async getVehicle(slug: string) {
      const vehicle = await inner.getVehicle(slug);
      return vehicle ? decorate(vehicle) : null;
    },
  };
}
