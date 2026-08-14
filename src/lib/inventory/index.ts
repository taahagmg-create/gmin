import type { InventorySource, Vehicle } from "@/lib/inventory/types";
import { createAutostockSource } from "@/lib/inventory/autostock";
import { createSampleSource } from "@/lib/inventory/sample";
import { createBeautifiedSource } from "@/lib/inventory/beautified";

export type { Vehicle, VehicleImage, InventorySource } from "@/lib/inventory/types";

/**
 * The one place that decides where stock comes from.
 *
 * Pages call listVehicles()/getVehicle() and never learn which implementation
 * answered. When Autostock provides a real feed, add a source module and change
 * the switch below — no page, component or type has to move.
 *
 * INVENTORY_SOURCE=sample runs offline against fixed data.
 */
export function getInventorySource(): InventorySource {
  const configured = (process.env.INVENTORY_SOURCE ?? "autostock").toLowerCase();

  const base = (() => {
    switch (configured) {
      case "sample":
        return createSampleSource();
      case "autostock":
        return createAutostockSource();
      default:
        console.warn(`[inventory] unknown INVENTORY_SOURCE "${configured}" — using autostock.`);
        return createAutostockSource();
    }
  })();

  // Swaps in beautified photos where the manifest has them. A no-op until the
  // pipeline has produced anything, so it is always safe to leave wired up.
  return createBeautifiedSource(base);
}

/**
 * Full current stock. Returns [] rather than throwing if the source is
 * unreachable: an inventory page that renders empty with a "call us" prompt is
 * a better outcome than a 500, and the sticky CTA and chat still work.
 */
export async function listVehicles(): Promise<Vehicle[]> {
  const source = getInventorySource();
  try {
    return await source.listVehicles();
  } catch (e) {
    console.error(`[inventory] ${source.name} listVehicles failed:`, e);
    return [];
  }
}

/** A single vehicle, or null when unknown or sold. */
export async function getVehicle(slug: string): Promise<Vehicle | null> {
  const source = getInventorySource();
  try {
    return await source.getVehicle(slug);
  } catch (e) {
    console.error(`[inventory] ${source.name} getVehicle(${slug}) failed:`, e);
    return null;
  }
}
