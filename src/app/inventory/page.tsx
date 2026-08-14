import type { Metadata } from "next";
import { listVehicles } from "@/lib/inventory";
import { toCardData } from "@/lib/inventory/types";
import { InventoryBrowser } from "@/components/inventory/inventory-browser";
import { CALL_NUMBER, hasCallNumber } from "@/lib/chat";

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Browse current stock at Esteem Cars — Takanini and New Lynn. Every vehicle backed by the Service Shield.",
};

/**
 * Stock changes roughly monthly (§8), so half-hourly revalidation is plenty and
 * keeps us from hammering the source site on every request.
 */
export const revalidate = 1800;

export default async function InventoryPage() {
  const vehicles = await listVehicles();
  // Map before crossing to the client — full records carry every spec and ~18
  // image URLs each, none of which a grid needs.
  const cards = vehicles.map(toCardData);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Current stock
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Every vehicle across both yards. All of them come with the Esteem Service Shield —
          so a breakdown doesn&apos;t come out of your pocket.
        </p>
      </header>

      {cards.length === 0 ? (
        /*
         * The source is unreachable rather than the yard being empty. Say
         * something useful and keep the working channels in front of them
         * instead of rendering an empty grid.
         */
        <div className="rounded-2xl border border-dashed border-ink-line p-10 text-center">
          <p className="text-white">We can&apos;t load the listings right now.</p>
          <p className="mt-2 text-sm text-neutral-400">
            Sorry about that — it&apos;s us, not you. The team can tell you what&apos;s on the
            lot right now.
          </p>
          {hasCallNumber() && (
            <a
              href={`tel:${CALL_NUMBER.e164}`}
              className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-hover"
            >
              Call {CALL_NUMBER.display}
            </a>
          )}
        </div>
      ) : (
        <InventoryBrowser vehicles={cards} />
      )}
    </div>
  );
}
