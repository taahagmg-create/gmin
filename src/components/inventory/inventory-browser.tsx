"use client";

import { useMemo, useState } from "react";
import type { VehicleCardData } from "@/lib/inventory/types";
import { PRICE_BANDS, SORT_OPTIONS, type PriceBandId, type SortId } from "@/lib/inventory/format";
import { VehicleCard } from "@/components/inventory/vehicle-card";

/**
 * Search, filter and sort over the full stock list.
 *
 * All in memory: the whole range is ~133 vehicles, so filtering client-side is
 * instant and costs no round trips. If stock ever grows past a few hundred this
 * should move to server-side filtering with URL state.
 */
export function InventoryBrowser({ vehicles }: { vehicles: VehicleCardData[] }) {
  const [query, setQuery] = useState("");
  const [make, setMake] = useState("all");
  const [bodyType, setBodyType] = useState("all");
  const [band, setBand] = useState<PriceBandId>("any");
  const [sort, setSort] = useState<SortId>("newest");

  const makes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make).filter(Boolean))].sort(),
    [vehicles],
  );
  const bodyTypes = useMemo(
    () => [...new Set(vehicles.map((v) => v.bodyType).filter((b): b is string => Boolean(b)))].sort(),
    [vehicles],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const priceBand = PRICE_BANDS.find((b) => b.id === band) ?? PRICE_BANDS[0];

    const filtered = vehicles.filter((v) => {
      if (q && !v.title.toLowerCase().includes(q)) return false;
      if (make !== "all" && v.make !== make) return false;
      if (bodyType !== "all" && v.bodyType !== bodyType) return false;

      if (priceBand.min !== null || priceBand.max !== null) {
        // A car without a price can't satisfy a price filter, so it drops out.
        if (v.priceNzd === null) return false;
        if (priceBand.min !== null && v.priceNzd < priceBand.min) return false;
        if (priceBand.max !== null && v.priceNzd >= priceBand.max) return false;
      }
      return true;
    });

    // Vehicles without a price sort last rather than reading as free.
    const price = (v: VehicleCardData) => v.priceNzd ?? Number.POSITIVE_INFINITY;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return price(a) - price(b);
        case "price-desc":
          return (b.priceNzd ?? -1) - (a.priceNzd ?? -1);
        case "odometer-asc":
          return (a.odometerKm ?? Number.POSITIVE_INFINITY) - (b.odometerKm ?? Number.POSITIVE_INFINITY);
        default:
          return (b.year ?? 0) - (a.year ?? 0);
      }
    });
  }, [vehicles, query, make, bodyType, band, sort]);

  const selectClass =
    "rounded-xl border border-ink-line bg-ink-soft px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none";

  const anyFilterActive =
    query.trim() !== "" || make !== "all" || bodyType !== "all" || band !== "any";

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="sm:col-span-2">
          <span className="sr-only">Search vehicles</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search make or model…"
            className={`w-full ${selectClass}`}
          />
        </label>

        <label>
          <span className="sr-only">Make</span>
          <select value={make} onChange={(e) => setMake(e.target.value)} className={`w-full ${selectClass}`}>
            <option value="all">All makes</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Body type</span>
          <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={`w-full ${selectClass}`}>
            <option value="all">All body types</option>
            {bodyTypes.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Price</span>
          <select
            value={band}
            onChange={(e) => setBand(e.target.value as PriceBandId)}
            className={`w-full ${selectClass}`}
          >
            {PRICE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400" aria-live="polite">
          {results.length} {results.length === 1 ? "vehicle" : "vehicles"}
          {anyFilterActive && ` of ${vehicles.length}`}
        </p>

        <label className="flex items-center gap-2 text-sm text-neutral-400">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className={selectClass}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink-line p-10 text-center">
          <p className="text-white">Nothing matches that just yet.</p>
          <p className="mt-2 text-sm text-neutral-400">
            Try widening the filters — or give us a call and we&apos;ll keep an eye out for you.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}
