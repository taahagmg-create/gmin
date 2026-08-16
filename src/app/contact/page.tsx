import type { Metadata } from "next";
import { LOCATIONS, FREEPHONE } from "@/lib/locations";
import { CALL_NUMBER, hasCallNumber } from "@/lib/chat";

export const metadata: Metadata = {
  title: "Contact",
  description: "Esteem Cars locations, opening hours and directions — Takanini and New Lynn.",
};

function LocationCard({ loc }: { loc: (typeof LOCATIONS)[keyof typeof LOCATIONS] }) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white">{loc.name}</h2>

      <address className="mt-4 not-italic text-sm leading-relaxed text-neutral-400">
        {loc.address}
        <br />
        {loc.suburb} {loc.postcode}
      </address>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Hours
        </h3>
        <dl className="mt-2 space-y-1 text-sm text-neutral-400">
          {loc.hours.map((h) => (
            <div key={h.days} className="flex justify-between gap-4">
              <dt>{h.days}</dt>
              <dd className="text-white">{h.time}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Team
        </h3>
        <ul className="mt-2 space-y-2">
          {loc.team.map((person) => (
            <li key={person.name} className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">{person.name}</span>
              <a
                href={`tel:${person.phone.e164}`}
                className="font-medium text-accent hover:text-accent-hover"
              >
                {person.phone.display}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={`mailto:${loc.email}`}
        className="mt-4 block text-sm text-accent hover:text-accent-hover"
      >
        {loc.email}
      </a>

      <div className="mt-5 flex gap-3">
        {loc.social.map((s) => (
          <a
            key={s.platform}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink-line px-3 py-1.5 text-xs text-neutral-400 transition hover:border-accent hover:text-accent"
          >
            {s.platform}
          </a>
        ))}
      </div>

      <a
        href={`https://www.google.com/maps/search/?api=1&query=${loc.googleMapsQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex rounded-full border border-ink-line px-4 py-2 text-sm text-neutral-400 transition hover:border-accent hover:text-accent"
      >
        Get directions
      </a>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
          Two yards, same team. Drop in during hours, call, or send us a message — whichever
          suits.
        </p>
        {hasCallNumber() && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={`tel:${CALL_NUMBER.e164}`}
              className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-hover"
            >
              Call {CALL_NUMBER.display}
            </a>
            <span className="text-sm text-neutral-500">
              or freephone{" "}
              <a
                href={`tel:${FREEPHONE.e164}`}
                className="text-neutral-400 hover:text-accent"
              >
                {FREEPHONE.display}
              </a>
            </span>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <LocationCard loc={LOCATIONS.takanini} />
        <LocationCard loc={LOCATIONS.newLynn} />
      </div>

      <div className="mt-10 rounded-2xl border border-ink-line bg-ink-soft p-6 text-center sm:p-8">
        <p className="text-sm text-neutral-400">
          Prefer email? Drop us a line at{" "}
          <a
            href="mailto:sales@esteemcars.co.nz"
            className="font-medium text-accent hover:text-accent-hover"
          >
            sales@esteemcars.co.nz
          </a>{" "}
          and someone will get back to you during business hours.
        </p>
      </div>
    </div>
  );
}
