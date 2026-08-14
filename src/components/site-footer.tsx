import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-line bg-ink-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-neutral-400 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-white">Esteem Car Traders</p>
          <p className="mt-2 text-neutral-500">Peace of mind, delivered.</p>
        </div>
        <div>
          <p className="font-semibold text-white">Takanini</p>
          <p className="mt-2 text-neutral-500">Address TBC · Hours TBC</p>
        </div>
        <div>
          <p className="font-semibold text-white">New Lynn</p>
          <p className="mt-2 text-neutral-500">Address TBC · Hours TBC</p>
        </div>
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
