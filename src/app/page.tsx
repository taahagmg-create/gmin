import Link from "next/link";
import { HeroSection } from "@/components/hero/hero-section";
import { OfferStrip } from "@/components/offer-strip";
import { InventoryTeaser } from "@/components/inventory/inventory-teaser";
import { TrustStrip } from "@/components/trust-strip";

export const revalidate = 1800;

/** The six-beat homepage sequence from brief §4, one section each. */
const FUNNEL = [
  {
    beat: "01",
    name: "Hero film",
    built: true,
    detail:
      "Full-bleed autoplay, muted with unmute prompt. Service Shield narrative, skip control, CTA fades in at end of sequence.",
  },
  {
    beat: "02",
    name: "Offer strip",
    built: true,
    detail:
      "2–3 auto-rotating offers: Service Shield explainer, stock specials, finance offer. Motion on scroll or interval — not a static banner.",
  },
  {
    beat: "03",
    name: "Sticky finance pre-qual",
    built: true,
    detail:
      "Persistent side pill opening the quiz as a slide-over, never a page nav. 30 seconds, no credit impact.",
  },
  {
    beat: "04",
    name: "Chat bot",
    built: true,
    detail:
      "Delayed trigger at 8–12s or 50% scroll. Routes to Retell AI, books or hands to human on intent.",
  },
  {
    beat: "05",
    name: "Inventory teaser",
    built: true,
    detail: "3–6 featured vehicles, 3D spin thumbnails auto-rotating slowly on hover or in view.",
  },
  {
    beat: "06",
    name: "Trust strip",
    built: true,
    detail: "Lender partner logos, review count and rating, peace-of-mind proof points.",
  },
];

const ROUTES = [
  { href: "/inventory", label: "/inventory" },
  { href: "/vehicle/demo-vehicle", label: "/vehicle/[slug]" },
  { href: "/service-shield", label: "/service-shield" },
  { href: "/finance", label: "/finance" },
  { href: "/about", label: "/about" },
  { href: "/contact", label: "/contact" },
];

export default function HomePage() {
  return (
    <>
      {/* Beats 01 and 02 are full-bleed, so they sit outside the page container. */}
      <HeroSection />
      <OfferStrip />
      <InventoryTeaser />
      <TrustStrip />

      <div className="mx-auto max-w-5xl px-5 py-16">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Homepage sequence — brief §4
          </h2>
          <ol className="mt-6 space-y-4">
            {FUNNEL.map((step) => (
              <li
                key={step.beat}
                className="flex gap-5 rounded-xl border border-ink-line bg-ink-soft p-5"
              >
                <span className="font-mono text-sm text-accent">{step.beat}</span>
                <div>
                  <p className="font-semibold text-white">
                    {step.name}
                    {step.built ? (
                      <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-widest text-accent">
                        built
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Dev-only convenience index. Remove before launch. */}
        <section className="mt-16 border-t border-ink-line pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Routes in this scaffold
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-full border border-ink-line px-3 py-1.5 font-mono text-xs text-neutral-400 transition hover:border-accent hover:text-accent"
              >
                {route.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
