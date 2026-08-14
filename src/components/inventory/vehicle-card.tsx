import Image from "next/image";
import Link from "next/link";
import type { VehicleCardData } from "@/lib/inventory/types";
import { formatOdometer, formatPrice } from "@/lib/inventory/format";

/**
 * Vehicle grid card — shared by the inventory listing and the homepage teaser
 * (beat 05), so the two can never drift.
 *
 * Photos are the heaviest thing on this page and the likely LCP element, so
 * they go through next/image for responsive sizing and modern formats. The
 * Autostock CDN host is allow-listed in next.config.mjs.
 */
export function VehicleCard({ vehicle }: { vehicle: VehicleCardData }) {
  return (
    <Link
      href={`/vehicle/${vehicle.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft transition hover:border-neutral-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-line">
        {vehicle.thumb ? (
          <Image
            src={vehicle.thumb}
            alt={vehicle.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-600">
            No photo yet
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold leading-snug text-white">{vehicle.title}</h3>

        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
          <div>
            <dt className="sr-only">Odometer</dt>
            <dd>{formatOdometer(vehicle.odometerKm)}</dd>
          </div>
          {vehicle.transmission && (
            <div>
              <dt className="sr-only">Transmission</dt>
              <dd>{vehicle.transmission}</dd>
            </div>
          )}
          {vehicle.bodyType && (
            <div>
              <dt className="sr-only">Body type</dt>
              <dd>{vehicle.bodyType}</dd>
            </div>
          )}
        </dl>

        <p
          className={`mt-3 font-semibold ${
            vehicle.priceNzd === null ? "text-sm text-accent" : "text-lg text-white"
          }`}
        >
          {formatPrice(vehicle)}
        </p>
      </div>
    </Link>
  );
}
