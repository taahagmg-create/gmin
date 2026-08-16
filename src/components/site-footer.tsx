import Link from "next/link";
import { LOCATIONS } from "@/lib/locations";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-line bg-ink-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-neutral-400 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-white">Esteem Car Traders</p>
          <p className="mt-2 text-neutral-500">Peace of mind, delivered.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link href="/inventory" className="hover:text-accent">
              Inventory
            </Link>
            <Link href="/service-shield" className="hover:text-accent">
              Service Shield
            </Link>
            <Link href="/finance" className="hover:text-accent">
              Finance
            </Link>
            <Link href="/about" className="hover:text-accent">
              About
            </Link>
            <Link href="/contact" className="hover:text-accent">
              Contact
            </Link>
          </div>
        </div>
        {Object.values(LOCATIONS).map((loc) => (
          <div key={loc.name}>
            <p className="font-semibold text-white">{loc.name.replace("Esteem Cars ", "")}</p>
            <address className="mt-2 not-italic text-neutral-500">
              {loc.address}, {loc.suburb} {loc.postcode}
            </address>
            <p className="mt-1 text-neutral-500">
              {loc.hours.map((h) => `${h.days}: ${h.time}`).join(" · ")}
            </p>
            <a
              href={`tel:${loc.phone.e164}`}
              className="mt-1 inline-block text-neutral-400 hover:text-accent"
            >
              {loc.phone.display}
            </a>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-line px-5 py-4 text-center text-xs text-neutral-600">
        <Link href="/contact" className="hover:text-neutral-300">
          Contact
        </Link>
        <span className="mx-2">·</span>
        Finance disclosures pending legal review (brief §6 compliance flag).
      </div>
    </footer>
  );
}
