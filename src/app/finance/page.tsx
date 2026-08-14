import type { Metadata } from "next";
import { PreQualifyCta } from "@/components/pre-qualify-cta";
import { HowItWorks } from "@/components/finance/how-it-works";
import { FinanceFaq } from "@/components/finance/finance-faq";

export const metadata: Metadata = {
  title: "Get pre-qualified",
  description:
    "Five quick questions, about 30 seconds. No credit check, and it won't affect your credit score.",
};

export default function FinancePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <section className="rounded-3xl border border-ink-line bg-gradient-to-br from-[#141a20] via-[#26303d] to-[#6b5527] p-8 sm:p-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">No pressure</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Let&apos;s see what your options look like.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-300 sm:text-base">
          Five quick questions about your situation — roughly 30 seconds. There&apos;s no credit
          check, nothing here affects your credit score, and you&apos;re not committing to
          anything by asking.
        </p>

        <div className="mt-8">
          <PreQualifyCta variant="hero" />
        </div>
      </section>

      <HowItWorks className="mt-16" />
      <FinanceFaq className="mt-16" />
    </div>
  );
}
