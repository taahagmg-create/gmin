import { FINANCE_DISCLAIMER, FINANCE_FAQ, FINANCE_LEGAL_REVIEWED } from "@/lib/finance-content";

/**
 * FAQ and legal fine print — deliberately separate from the quiz flow.
 *
 * Built on <details>/<summary> so it expands without JavaScript and is
 * keyboard- and screen-reader-navigable by default.
 */
export function FinanceFaq({ className = "" }: { className?: string }) {
  const showUnreviewedWarning =
    !FINANCE_LEGAL_REVIEWED && process.env.NODE_ENV !== "production";

  return (
    <section aria-labelledby="finance-faq-heading" className={className}>
      <h2
        id="finance-faq-heading"
        className="text-xs font-semibold uppercase tracking-widest text-neutral-500"
      >
        Common questions
      </h2>

      <div className="mt-6 divide-y divide-ink-line border-y border-ink-line">
        {FINANCE_FAQ.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white marker:content-none">
              {item.q}
              <span
                aria-hidden="true"
                className="shrink-0 text-neutral-500 transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">{item.a}</p>
          </details>
        ))}
      </div>

      {/*
        Development-only guard. The disclaimer below is an unreviewed first
        draft; this banner exists so it cannot be shipped by forgetting about
        it. It never renders in production — flip FINANCE_LEGAL_REVIEWED once a
        lawyer has signed the wording off.
      */}
      {showUnreviewedWarning && (
        <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <strong>Dev only:</strong> the disclaimer below is an unreviewed draft and has not been
          checked against the CCCFA, Fair Trading Act, or Privacy Act. Route it through legal
          before launch, then set <code>FINANCE_LEGAL_REVIEWED</code> to <code>true</code>.
        </p>
      )}

      <div className="mt-8 space-y-3">
        {FINANCE_DISCLAIMER.map((para) => (
          <p key={para.slice(0, 32)} className="text-xs leading-relaxed text-neutral-600">
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}
