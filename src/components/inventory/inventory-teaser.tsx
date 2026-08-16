import Link from "next/link";
import { listVehicles } from "@/lib/inventory";
import type { Vehicle } from "@/lib/inventory/types";
import { toCardData } from "@/lib/inventory/types";
import { VehicleCard } from "./vehicle-card";

const TEASER_COUNT = 6;

function pickFeatured(vehicles: Vehicle[]): Vehicle[] {
  const withPrice = vehicles.filter((v) => v.priceNzd !== null);
  if (withPrice.length <= TEASER_COUNT) return withPrice.slice(0, TEASER_COUNT);

  const sorted = [...withPrice].sort((a, b) => (b.priceNzd ?? 0) - (a.priceNzd ?? 0));
  const step = Math.floor(sorted.length / TEASER_COUNT);
  const picked: Vehicle[] = [];
  for (let i = 0; picked.length < TEASER_COUNT && i < sorted.length; i += step) {
    picked.push(sorted[i]);
  }
  return picked;
}

export async function InventoryTeaser() {
  const vehicles = await listVehicles();
  if (vehicles.length === 0) return null;

  const cards = pickFeatured(vehicles).map(toCardData);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            On the lot right now
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            {vehicles.length} vehicles across both yards — every one backed by the Service
            Shield.
          </p>
        </div>
        <Link
          href="/inventory"
          className="hidden shrink-0 rounded-full border border-accent px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-ink sm:inline-flex"
        >
          View all stock
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <VehicleCard key={card.id} vehicle={card} />
        ))}
      </div>

      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/inventory"
          className="inline-flex rounded-full border border-accent px-6 py-3 text-sm font-semibold text-accent transition hover:bg-accent hover:text-ink"
        >
          View all {vehicles.length} vehicles
        </Link>
      </div>
    </section>
  );
}
