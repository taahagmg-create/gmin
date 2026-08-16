import type { Metadata } from "next";
import Link from "next/link";
import { PreQualifyCta } from "@/components/pre-qualify-cta";
import { REVIEWS } from "@/lib/trust";
import { CALL_NUMBER, hasCallNumber } from "@/lib/chat";

export const metadata: Metadata = {
  title: "Service Shield",
  description:
    "The Esteem Service Shield — cover that means a breakdown doesn't come out of your pocket.",
};

const COVERED = [
  {
    title: "Engine and transmission",
    detail: "The expensive stuff — internal components, gearbox, and drivetrain.",
  },
  {
    title: "Electrical and electronics",
    detail: "Starter motor, alternator, power windows, central locking, and more.",
  },
  {
    title: "Cooling and fuel system",
    detail: "Radiator, water pump, thermostat, fuel pump, and injectors.",
  },
  {
    title: "Steering and suspension",
    detail: "Power steering pump, rack, ball joints, CV joints, and wheel bearings.",
  },
  {
    title: "Brakes",
    detail: "Master cylinder, callipers, wheel cylinders, and brake booster.",
  },
  {
    title: "Air conditioning",
    detail: "Compressor, condenser, and evaporator.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Buy any Esteem vehicle",
    detail: "The Shield is included — it's not an upsell or an add-on. Every car gets it.",
  },
  {
    step: "02",
    title: "Something breaks",
    detail:
      "Call us. We'll talk you through what's happened and point you to the nearest approved repairer.",
  },
  {
    step: "03",
    title: "We handle the bill",
    detail:
      "The covered repair gets sorted. You're not out of pocket for parts or labour on anything the Shield covers.",
  },
];

export default function ServiceShieldPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-ink to-ink-soft">
        <div className="mx-auto max-w-4xl px-5 pb-16 pt-20 text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Included with every vehicle
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            The Esteem Service Shield
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-300 sm:text-base">
            A breakdown shouldn&apos;t come out of your pocket. Every car we sell comes with
            mechanical cover — so you can drive away knowing the big stuff is taken care of.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <PreQualifyCta variant="hero" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
          How it works
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="text-center">
              <span className="font-mono text-sm text-accent">{item.step}</span>
              <h3 className="mt-2 font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's covered */}
      <section className="border-y border-ink-line bg-ink-soft">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
            What&apos;s covered
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COVERED.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-ink-line bg-ink p-5"
              >
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-neutral-500">
            Coverage details are provided at the point of sale. The above is a summary of
            common components — the full schedule is in your warranty document.
          </p>
        </div>
      </section>

      {/* Trust + CTA */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="text-sm text-neutral-400">
          {REVIEWS.combined.rating} stars across {REVIEWS.combined.count} Google reviews.
        </p>
        <p className="mt-6 text-lg font-semibold text-white">
          Ready to see what&apos;s on the lot?
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/inventory"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-hover"
          >
            Browse current stock
          </Link>
          {hasCallNumber() && (
            <a
              href={`tel:${CALL_NUMBER.e164}`}
              className="rounded-full border border-ink-line px-6 py-3 text-sm font-semibold text-neutral-300 transition hover:border-accent hover:text-accent"
            >
              Call {CALL_NUMBER.display}
            </a>
          )}
        </div>
      </section>
    </>
  );
}
