import Link from "next/link";

type PagePlaceholderProps = {
  /** Route this page answers to, e.g. "/inventory". */
  route: string;
  title: string;
  /** One-line statement of what this screen is for. */
  purpose: string;
  /** Section of esteem-cars-build.md this page is specced in, e.g. "§4". */
  briefRef?: string;
  /** What still has to be built here, straight from the brief. */
  todo: string[];
  /** Phase 2 / content-dependent items, per brief §7. */
  later?: string[];
};

/**
 * Uniform stub used by every route until the real screen lands.
 * Delete the import along with the placeholder when a page is built out.
 */
export function PagePlaceholder({
  route,
  title,
  purpose,
  briefRef,
  todo,
  later,
}: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        {route}
        {briefRef ? <span className="ml-2 text-neutral-600">brief {briefRef}</span> : null}
      </p>

      <h1 className="mt-3 text-4xl font-semibold text-white">{title}</h1>
      <p className="mt-4 text-lg text-neutral-400">{purpose}</p>

      <div className="mt-10 rounded-xl border border-ink-line bg-ink-soft p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Phase 1 — to build
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-neutral-300">
          {todo.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="text-neutral-600">□</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {later?.length ? (
          <>
            <h2 className="mt-8 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Phase 2 — content-dependent
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              {later.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="text-neutral-700">□</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-neutral-500 transition hover:text-accent"
      >
        ← Back to home
      </Link>
    </div>
  );
}
