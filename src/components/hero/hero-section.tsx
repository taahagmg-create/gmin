"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HERO_BEATS,
  HERO_CAPTIONS,
  HERO_CTA_REVEAL_AT,
  HERO_DESKTOP_BREAKPOINT,
  HERO_DURATION,
  HERO_SOURCES,
  beatIndexAt,
  captionIndexAt,
  ctaOpacityAt,
  hasHeroVideo,
} from "@/lib/hero-timeline";
import { PreQualifyCta } from "@/components/pre-qualify-cta";

/**
 * Hero film section (brief §4.1).
 *
 * Full-bleed, autoplay, muted with an unmute prompt, skip control, timed
 * captions, and a CTA that fades in on the final beat.
 *
 * Two independent sources swap at the md breakpoint — a 16:9 desktop cut and a
 * genuinely vertical 9:16 mobile cut. Selection runs through matchMedia rather
 * than CSS so only the needed file is ever fetched, and the element re-keys on
 * breakpoint change so rotating a phone picks up the right cut.
 *
 * With HERO_SOURCES empty the section runs in placeholder mode: the same
 * timeline drives an animated gradient, so caption timing and the CTA fade are
 * fully live and reviewable before any footage exists.
 */
export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Origin for the synthetic clock used in placeholder mode (and while the
  // video is buffering). Shifted by the skip control.
  const originRef = useRef(0);

  // Last-committed derived values, so the rAF loop only triggers a React
  // render when something visible actually changes.
  const lastBeat = useRef(0);
  const lastCaption = useRef(-1);
  const lastCta = useRef(0);
  const lastProgress = useRef(0);

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(-1);
  const [ctaOpacity, setCtaOpacity] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  const hasVideo = hasHeroVideo(HERO_SOURCES);

  // Which cut to load. Null until matchMedia resolves, so the server never
  // guesses a breakpoint and no file is fetched twice.
  const src = isDesktop === null ? "" : isDesktop ? HERO_SOURCES.desktop : HERO_SOURCES.mobile;
  const poster =
    isDesktop === null ? "" : isDesktop ? HERO_SOURCES.posterDesktop : HERO_SOURCES.posterMobile;
  const showVideo = hasVideo && src.length > 0;

  useEffect(() => {
    originRef.current = performance.now();
  }, []);

  // Breakpoint — drives which of the two sources is used.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${HERO_DESKTOP_BREAKPOINT}px)`);
    const apply = () => setIsDesktop(mq.matches);
    apply();

    // The matchMedia change event is the primary signal, but it does not fire
    // under devtools device emulation and has been unreliable across iOS
    // orientation changes. resize/orientationchange are a cheap safety net —
    // re-reading mq.matches is idempotent, so React bails on identical values
    // and no extra request is made.
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // React sets `muted` as a property, not an attribute, which some browsers
  // ignore when deciding whether autoplay is allowed. Set it directly too.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, src]);

  // The clock. Prefers the video's own currentTime once it is actually playing
  // so captions stay locked to the picture even if playback stalls; otherwise
  // it falls back to a synthetic clock so placeholder mode runs identically.
  useEffect(() => {
    // Under reduced motion the clock never runs; the end state is derived at
    // render instead (see displayed* below) rather than pushed into state here.
    if (reducedMotion) return;

    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      const t =
        video && video.readyState >= 2 && !video.paused
          ? video.currentTime % HERO_DURATION
          : ((performance.now() - originRef.current) / 1000) % HERO_DURATION;

      const nextBeat = beatIndexAt(t);
      const nextCaption = captionIndexAt(t);
      // Quantised so the CTA fade doesn't re-render on every single frame.
      const nextCta = Math.round(ctaOpacityAt(t) * 20) / 20;
      const nextProgress = Math.round((t / HERO_DURATION) * 100) / 100;

      if (nextBeat !== lastBeat.current) {
        lastBeat.current = nextBeat;
        setBeatIndex(nextBeat);
      }
      if (nextCaption !== lastCaption.current) {
        lastCaption.current = nextCaption;
        setCaptionIndex(nextCaption);
      }
      if (nextCta !== lastCta.current) {
        lastCta.current = nextCta;
        setCtaOpacity(nextCta);
      }
      if (nextProgress !== lastProgress.current) {
        lastProgress.current = nextProgress;
        setProgress(nextProgress);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const toggleSound = useCallback(() => {
    const next = !muted;
    setMuted(next);
    const video = videoRef.current;
    if (video) {
      video.muted = next;
      if (!next) void video.play().catch(() => {});
    }
  }, [muted]);

  // Skip straight to the payoff/CTA rather than dropping the section entirely —
  // the visitor still lands on the conversion beat.
  const skipToCta = useCallback(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 1) video.currentTime = HERO_CTA_REVEAL_AT;
    originRef.current = performance.now() - HERO_CTA_REVEAL_AT * 1000;
  }, []);

  // Reduced motion holds the final beat: no movement, no captions, CTA already
  // up. Derived rather than stored so the effect never writes state directly.
  const displayedBeatIndex = reducedMotion ? HERO_BEATS.length - 1 : beatIndex;
  const displayedCaptionIndex = reducedMotion ? -1 : captionIndex;
  const displayedCtaOpacity = reducedMotion ? 1 : ctaOpacity;
  const displayedProgress = reducedMotion ? 1 : progress;

  const beat = HERO_BEATS[displayedBeatIndex];
  const ctaShown = displayedCtaOpacity > 0.99;

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
      {showVideo ? (
        <video
          // Re-key so switching breakpoint loads the other cut cleanly.
          key={src}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          poster={poster || undefined}
          autoPlay={!reducedMotion}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      ) : (
        <div
          className="absolute inset-0 transition-[background] duration-[1400ms] ease-out"
          style={{ background: beat.gradient }}
          aria-hidden="true"
        />
      )}

      {/* Scrim — keeps captions legible over any footage. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10"
        aria-hidden="true"
      />

      {/* Controls */}
      <div
        className={`absolute right-4 z-20 flex items-center gap-2 ${
          hasVideo ? "top-4" : "top-14"
        }`}
      >
        <button
          type="button"
          onClick={toggleSound}
          disabled={!hasVideo}
          aria-label={muted ? "Unmute hero film" : "Mute hero film"}
          className="rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-40"
          title={hasVideo ? undefined : "No audio in placeholder mode"}
        >
          {muted ? "🔇 Tap for sound" : "🔊 Sound on"}
        </button>

        {!ctaShown && (
          <button
            type="button"
            onClick={skipToCta}
            className="rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60"
          >
            Skip ↓
          </button>
        )}
      </div>

      {/* Captions + end card */}
      <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-14 sm:pb-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="relative min-h-[3.5rem] sm:min-h-[4.5rem]">
            {HERO_CAPTIONS.map((caption, i) => (
              <p
                key={caption.start}
                aria-hidden={i !== displayedCaptionIndex}
                className={`absolute inset-x-0 bottom-0 text-lg font-medium leading-snug text-white drop-shadow-lg transition-opacity duration-700 sm:text-3xl ${
                  i === displayedCaptionIndex ? "opacity-100" : "opacity-0"
                }`}
              >
                {caption.text}
              </p>
            ))}
          </div>

          {/*
            Kept in the DOM at all times rather than mounted on the final beat —
            the h1 has to be crawlable, so this fades rather than appears.
          */}
          {/*
            Without JS the clock never runs, so the inline opacity would strand
            the h1 and CTA invisible. This reveals them for those visitors only —
            JS visitors still get the fade, with no flash on hydration.
          */}
          <noscript>
            <style>{`.hero-endcard{opacity:1!important;pointer-events:auto!important}`}</style>
          </noscript>

          <div
            className="hero-endcard mt-7 transition-opacity duration-300"
            style={{ opacity: displayedCtaOpacity, pointerEvents: ctaShown ? "auto" : "none" }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Peace of mind, delivered.
            </h1>

            {/* The CTA carries its own trust line now, so no separate sublabel. */}
            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-start">
              <PreQualifyCta variant="hero" />
              <Link
                href="/service-shield"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/*
        Placeholder-mode review strip: shows which beat is playing and where the
        loop is. Sits at the top so it never collides with the sticky finance CTA
        pinned to the bottom on mobile. Disappears on its own the moment real
        sources are wired.
      */}
      {!hasVideo && (
        <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/50 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-2 font-mono text-[11px] text-neutral-400">
            <span className="text-accent">placeholder</span>
            <span>
              {beat.label} · {beat.start}–{beat.end}s
            </span>
            <span className="ml-auto">
              {(displayedProgress * HERO_DURATION).toFixed(1)}s / {HERO_DURATION}s
            </span>
          </div>
          <div className="h-0.5 w-full bg-white/10">
            <div
              className="h-full bg-accent"
              style={{ width: `${displayedProgress * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </section>
  );
}
