import type { Metadata } from "next";
import Link from "next/link";
import { LOCATIONS } from "@/lib/locations";
import { REVIEWS } from "@/lib/trust";

export const metadata: Metadata = {
  title: "About",
  description: "The Esteem Car Traders story — two Auckland yards, Takanini and New Lynn.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          About Esteem
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Family-owned. Two yards. Over a decade in the business.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-neutral-300">
        <p>
          Esteem Car Traders is a family-owned and operated used car dealership with two
          yards in Auckland — Takanini and New Lynn. The team has been in the automotive
          industry for over ten years, and the business is built on a straightforward idea:
          buy a car here, and a breakdown shouldn&apos;t come out of your pocket.
        </p>

        <p>
          Every vehicle on the lot is hand-selected and put through a multi-point mechanical
          inspection before it&apos;s listed. The stock is mostly Japanese imports — clean,
          well-maintained cars with transparent odometer and grading details.
        </p>

        <p>
          That inspection is backed by the{" "}
          <Link href="/service-shield" className="text-accent hover:text-accent-hover">
            Esteem Service Shield
          </Link>{" "}
          — a warranty programme included with every car. It exists because the team saw
          too many buyers get hit with unexpected repair bills weeks after driving away, and
          decided that shouldn&apos;t be the norm.
        </p>

        <p>
          Finance is handled through four established NZ lenders — Avanti Finance, CFS,
          Geneva Finance, and Oxford Finance — so there&apos;s room to tailor a package that
          fits. The process is designed to be low-pressure from start to finish.
        </p>
      </div>

      {/* Review stats */}
      <div className="mt-12 rounded-2xl border border-ink-line bg-ink-soft p-6 sm:p-8">
        <div className="grid gap-8 text-center sm:grid-cols-3">
          <div>
            <p className="text-3xl font-semibold text-white">{REVIEWS.combined.count}+</p>
            <p className="mt-1 text-sm text-neutral-400">Google reviews</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-white">{REVIEWS.combined.rating}</p>
            <p className="mt-1 text-sm text-neutral-400">average rating</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-white">10+</p>
            <p className="mt-1 text-sm text-neutral-400">years in the industry</p>
          </div>
        </div>
      </div>

      {/* Yards */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white">The yards</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {Object.values(LOCATIONS).map((loc) => (
            <div key={loc.name} className="rounded-2xl border border-ink-line bg-ink-soft p-6">
              <h3 className="font-semibold text-white">{loc.name}</h3>
              <address className="mt-2 not-italic text-sm text-neutral-400">
                {loc.address}, {loc.suburb} {loc.postcode}
              </address>
              <div className="mt-3 space-y-1 text-sm text-neutral-400">
                {loc.hours.map((h) => (
                  <p key={h.days}>
                    {h.days}: <span className="text-neutral-300">{h.time}</span>
                  </p>
                ))}
              </div>
              <a
                href={`tel:${loc.phone.e164}`}
                className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
              >
                {loc.phone.display}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/contact"
          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-hover"
        >
          Get in touch
        </Link>
      </div>
    </div>
  );
}
