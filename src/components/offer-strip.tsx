"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OFFERS, OFFER_ROTATE_MS } from "@/lib/offers";
import { PreQualifyCta } from "@/components/pre-qualify-cta";

/**
 * Auto-rotating offer strip (brief §4.2).
 *
 * Rotation pauses whenever it would be rude or wasteful to keep moving: on
 * hover, while anything inside has keyboard focus, when the strip is scrolled
 * out of view, and entirely under prefers-reduced-motion. Dots allow manual
 * selection, which also stops the auto-advance for the rest of the session —
 * once someone has chosen a card, moving it out from under them is hostile.
 */
export function OfferStrip() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userPicked, setUserPicked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Don't rotate a strip nobody is looking at.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const paused = hovered || focused || !inView || reducedMotion || userPicked;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % OFFERS.length);
    }, OFFER_ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      aria-labelledby="offer-strip-heading"
      className="border-y border-ink-line bg-ink-soft"
    >
      <h2 id="offer-strip-heading" className="sr-only">
        Current offers
      </h2>

      <div
        ref={containerRef}
        className="mx-auto max-w-5xl px-5 py-10"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
      >
        {/*
          All cards occupy the same grid cell, so the strip is as tall as its
          tallest offer and never jumps height mid-rotation.
        */}
        <div className="grid">
          {OFFERS.map((offer, i) => {
            const active = i === index;
            return (
              <div
                key={offer.id}
                aria-hidden={!active}
                // inert covers every descendant, so the finance card's shared
                // CTA pill leaves the tab order too — a plain tabIndex guard on
                // the link branch alone left it focusable while hidden, which is
                // both a keyboard trap and an aria-hidden violation.
                inert={!active}
                className={`col-start-1 row-start-1 rounded-2xl border border-ink-line bg-gradient-to-br p-7 transition-all duration-700 ease-out sm:p-9 ${offer.accent} ${
                  active
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-2 opacity-0"
                }`}
              >
                <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                  {offer.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  {offer.headline}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-300 sm:text-base">
                  {offer.body}
                </p>

                <div className="mt-6">
                  {offer.usePreQualifyCta ? (
                    <PreQualifyCta variant="hero" />
                  ) : (
                    <Link
                      href={offer.href}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                    >
                      {offer.cta} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          {OFFERS.map((offer, i) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setUserPicked(true);
              }}
              aria-label={`Show offer: ${offer.headline}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                i === index ? "w-8 bg-accent" : "w-3 bg-neutral-700 hover:bg-neutral-500"
              }`}
            />
          ))}

          {paused && !reducedMotion && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              paused
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
