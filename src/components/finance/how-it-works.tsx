import { HOW_IT_WORKS } from "@/lib/finance-content";

/**
 * Three-step explainer sitting beside the main finance CTA.
 *
 * The job here is to remove the "what am I actually starting?" hesitation
 * before someone taps — so it says plainly where the answers go and that a
 * human comes back. No timeline promises beyond "shortly".
 */
export function HowItWorks({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="how-it-works-heading" className={className}>
      <h2
        id="how-it-works-heading"
        className="text-xs font-semibold uppercase tracking-widest text-neutral-500"
      >
        How it works
      </h2>

      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {HOW_IT_WORKS.map((s) => (
          <li key={s.step} className="rounded-2xl border border-ink-line bg-ink-soft p-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 font-mono text-sm text-accent">
              {s.step}
            </span>
            <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
