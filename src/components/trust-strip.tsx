import { REVIEWS, FINANCE_PARTNERS, PROOF_POINTS } from "@/lib/trust";

function Stars({ rating, id }: { rating: number; id: string }) {
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = i < full ? 1 : i === full ? partial : 0;
        const gradId = `${id}-star-${i}`;
        return (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId}>
                <stop offset={`${fill * 100}%`} stopColor="#facc15" />
                <stop offset={`${fill * 100}%`} stopColor="#3f3f46" />
              </linearGradient>
            </defs>
            <path
              d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"
              fill={`url(#${gradId})`}
            />
          </svg>
        );
      })}
    </div>
  );
}

export function TrustStrip() {
  const { combined } = REVIEWS;

  return (
    <section className="border-y border-ink-line bg-ink-soft">
      <div className="mx-auto max-w-6xl px-5 py-16">
        {/* Reviews */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <Stars rating={combined.rating} id="trust" />
            <span className="text-2xl font-semibold text-white">
              {combined.rating}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            {combined.count} Google reviews across both yards
          </p>
          <div className="mt-3 flex justify-center gap-6 text-xs text-neutral-500">
            <span>
              Takanini {REVIEWS.takanini.rating} ({REVIEWS.takanini.count})
            </span>
            <span>
              New Lynn {REVIEWS.newLynn.rating} ({REVIEWS.newLynn.count})
            </span>
          </div>
        </div>

        {/* Proof points */}
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {PROOF_POINTS.map((point) => (
            <div key={point.label} className="text-center">
              <p className="text-sm font-semibold text-white">{point.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                {point.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Finance partners */}
        <div className="mt-12 border-t border-ink-line pt-10">
          <p className="text-center text-xs uppercase tracking-widest text-neutral-500">
            Finance through
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {FINANCE_PARTNERS.map((partner) => (
              <span
                key={partner.name}
                className="text-sm font-medium text-neutral-400"
              >
                {partner.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
