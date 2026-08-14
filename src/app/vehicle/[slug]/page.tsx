import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicle } from "@/lib/inventory";
import { formatOdometer, formatPrice } from "@/lib/inventory/format";
import { VehicleGallery } from "@/components/inventory/vehicle-gallery";
import { PreQualifyCta } from "@/components/pre-qualify-cta";
import { CALL_NUMBER, hasCallNumber } from "@/lib/chat";

type VehiclePageProps = { params: Promise<{ slug: string }> };

export const revalidate = 1800;

export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);

  if (!vehicle) return { title: "Vehicle not found" };

  const price = formatPrice(vehicle);
  return {
    title: vehicle.title,
    description: `${vehicle.title} — ${formatOdometer(vehicle.odometerKm)}, ${price}. Backed by the Esteem Service Shield.`,
    openGraph: vehicle.images[0] ? { images: [vehicle.images[0].full] } : undefined,
  };
}

/** Spec rows worth promoting above the full table. */
function highlights(v: Awaited<ReturnType<typeof getVehicle>>) {
  if (!v) return [];
  return [
    { label: "Odometer", value: formatOdometer(v.odometerKm) },
    { label: "Transmission", value: v.transmission },
    { label: "Body", value: v.bodyType },
    { label: "Engine", value: v.engine },
  ].filter((h): h is { label: string; value: string } => Boolean(h.value));
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);

  // Covers both an unknown slug and a car that has since sold — Autostock drops
  // sold stock from the sitemap, so this is the normal end-of-life for a page.
  if (!vehicle) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Link href="/inventory" className="text-sm text-neutral-500 transition hover:text-accent">
        ← All vehicles
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <VehicleGallery images={vehicle.images} title={vehicle.title} />
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {vehicle.title}
          </h1>

          <p
            className={`mt-3 font-semibold ${
              vehicle.priceNzd === null ? "text-xl text-accent" : "text-3xl text-white"
            }`}
          >
            {formatPrice(vehicle)}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            {highlights(vehicle).map((h) => (
              <div key={h.label} className="rounded-xl border border-ink-line bg-ink-soft px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{h.label}</dt>
                <dd className="mt-1 text-sm font-medium text-white">{h.value}</dd>
              </div>
            ))}
          </dl>

          {/*
            The quiz is pre-filled with this vehicle: the slug rides through to
            Marenly as vehicle_interest, so the team knows which car prompted
            the enquiry without asking.
          */}
          <div className="mt-8">
            <PreQualifyCta variant="hero" vehicleSlug={vehicle.slug} />
          </div>

          {hasCallNumber() && (
            <a
              href={`tel:${CALL_NUMBER.e164}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <span aria-hidden="true">📞</span> Ask about this one — {CALL_NUMBER.display}
            </a>
          )}

          <p className="mt-4 text-xs text-neutral-500">
            Covered by the Esteem Service Shield.{" "}
            <Link href="/service-shield" className="underline hover:text-neutral-300">
              What that means
            </Link>
          </p>
        </div>
      </div>

      {Object.keys(vehicle.specs).length > 0 && (
        <section className="mt-14">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Specifications
          </h2>
          <dl className="mt-4 grid gap-x-8 border-t border-ink-line sm:grid-cols-2">
            {Object.entries(vehicle.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-ink-line py-3">
                <dt className="text-sm text-neutral-500">{key}</dt>
                <dd className="text-right text-sm text-neutral-200">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
