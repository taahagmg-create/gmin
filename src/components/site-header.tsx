import Link from "next/link";
import { CALL_NUMBER, hasCallNumber } from "@/lib/chat";

const NAV = [
  { href: "/inventory", label: "Inventory" },
  { href: "/service-shield", label: "Service Shield" },
  { href: "/finance", label: "Finance" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Esteem<span className="text-accent">.</span>
        </Link>

        <nav className="hidden gap-6 text-sm text-neutral-400 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/*
            Click-to-call. Mobile traffic dominates for a dealership (§10), so
            this stays visible at every width — the number itself from sm up,
            a labelled call action below that.
          */}
          {hasCallNumber() ? (
            <a
              href={`tel:${CALL_NUMBER.e164}`}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              <span aria-hidden="true">📞</span>
              <span className="hidden sm:inline">{CALL_NUMBER.display}</span>
              <span className="sm:hidden">Call</span>
              <span className="sr-only">Call Esteem Cars on {CALL_NUMBER.display}</span>
            </a>
          ) : (
            process.env.NODE_ENV !== "production" && (
              <span
                title="CALL_NUMBER is empty in src/lib/chat.ts — no number has been supplied yet."
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-200"
              >
                Dev: no phone number set
              </span>
            )
          )}

          <Link
            href="/finance"
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink transition hover:bg-accent-hover"
          >
            Get pre-qualified
          </Link>
        </div>
      </div>

      {/* Mobile nav is a placeholder — replace with a drawer before launch. */}
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-ink-line px-5 py-2 text-xs text-neutral-500 md:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-white">
            {item.label}
          </Link>
        ))}

        {/* The full number on mobile, where tapping it actually dials. */}
        {hasCallNumber() && (
          <a
            href={`tel:${CALL_NUMBER.e164}`}
            className="ml-auto whitespace-nowrap font-semibold text-accent"
          >
            📞 {CALL_NUMBER.display}
          </a>
        )}
      </nav>
    </header>
  );
}
