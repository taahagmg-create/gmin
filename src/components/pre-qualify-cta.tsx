"use client";

import Link from "next/link";
import { useFinanceQuiz } from "@/components/finance/quiz-provider";
import { QUIZ_TRUST_POINTS } from "@/lib/finance-quiz";

/**
 * The pre-qualification call to action (brief §4.3, §6, quiz build spec).
 *
 * One component for every placement, so the hero end card, the sticky pill and
 * the offer strip can never drift apart in wording, styling or behaviour.
 *
 * Every instance carries the same promise underneath — no credit check, 30
 * seconds, free — because a visitor should never have to wonder what they are
 * signing up for before they tap. That microcopy is not optional decoration;
 * it is the reason the tap feels safe.
 *
 * Compliance (§6): copy stays at "check your options". Never "approved",
 * "guaranteed", or any implied outcome.
 */

export const PRE_QUALIFY_LABEL = "Get pre-qualified";

type PreQualifyCtaProps = {
  /** `hero` — large pill. `sticky` — persistent viewport-edge pill. */
  variant?: "hero" | "sticky";
  className?: string;
  /** Hide the trust line where space genuinely cannot carry it. */
  showTrust?: boolean;
  /** Vehicle context, pre-filling the lead when opened from a vehicle page. */
  vehicleSlug?: string;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "text-ink transition focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-accent";

const VARIANTS = {
  hero: "bg-accent px-7 py-3.5 text-sm sm:text-base hover:bg-accent-hover shadow-lg shadow-black/30",
  sticky: "bg-accent px-4 py-2.5 text-xs hover:bg-accent-hover shadow-lg shadow-black/40",
} as const;

export function PreQualifyCta({
  variant = "hero",
  className = "",
  showTrust = true,
  vehicleSlug,
}: PreQualifyCtaProps) {
  const quiz = useFinanceQuiz();
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  const trust = showTrust ? (
    <p
      className={`mt-2 text-neutral-400 ${
        variant === "sticky" ? "text-[10px]" : "text-xs"
      } text-center sm:text-left`}
    >
      {QUIZ_TRUST_POINTS.join(" · ")}
    </p>
  ) : null;

  // With the provider mounted the quiz opens in place (§4.3 — never a page nav).
  // Without it, degrade to the finance page rather than throwing.
  const control = quiz ? (
    <button type="button" onClick={() => quiz.open({ vehicleSlug })} className={classes}>
      {PRE_QUALIFY_LABEL}
    </button>
  ) : (
    <Link href="/finance" className={classes}>
      {PRE_QUALIFY_LABEL}
    </Link>
  );

  if (!trust) return control;

  return (
    <div className={variant === "sticky" ? "text-center" : ""}>
      {control}
      {trust}
    </div>
  );
}
