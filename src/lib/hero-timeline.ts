/**
 * Hero film pacing and asset wiring (brief §4.1).
 *
 * Everything about the hero's timing lives here so the component never hardcodes
 * a beat. When the real Service Shield cut lands, re-time the film by editing
 * this file alone.
 */

export type HeroSources = {
  /** 16:9 — 1920x1080. Served at md and above. */
  desktop: string;
  /** 9:16 — 1080x1920. A genuinely vertical shot, NOT a crop of the desktop file. */
  mobile: string;
  /** Poster frame for the desktop cut. Shown before the video decodes. */
  posterDesktop: string;
  /** Poster frame for the mobile cut. */
  posterMobile: string;
};

/**
 * The one place to swap in the real film.
 *
 * Currently pointing at **stock placeholder footage**, not the Service Shield
 * film — Pixabay clips encoded to the timeline's pacing so the section can be
 * reviewed with real video in place. Replace these four files (same names, same
 * spec) when the real cut is delivered; no code change needed.
 *
 * Setting all four back to "" returns the hero to gradient mode, which runs the
 * identical timeline without any video.
 *
 * See public/hero/README.md for the encode spec and commands.
 */
export const HERO_SOURCES: HeroSources = {
  desktop: "/hero/hero-desktop-16x9.mp4",
  mobile: "/hero/hero-mobile-9x16.mp4",
  posterDesktop: "/hero/hero-desktop-16x9.jpg",
  posterMobile: "/hero/hero-mobile-9x16.jpg",
};

export function hasHeroVideo(sources: HeroSources): boolean {
  return sources.desktop.length > 0 && sources.mobile.length > 0;
}

/** Total loop length in seconds. Must match the encoded assets. */
export const HERO_DURATION = 30;

/** Viewport width (px) at or above which the 16:9 desktop cut is used — Tailwind's md. */
export const HERO_DESKTOP_BREAKPOINT = 768;

export type HeroBeat = {
  id: "tension" | "transition" | "payoff" | "cta";
  label: string;
  start: number;
  end: number;
  /** Placeholder-mode backdrop for this beat. Ignored once real video is wired. */
  gradient: string;
};

/**
 * Shot-list pacing: 12s quiet/tension → 4s transition → 10s payoff → 4s CTA.
 * The placeholder honours these exact beats so nothing needs re-timing later.
 */
export const HERO_BEATS: HeroBeat[] = [
  {
    id: "tension",
    label: "Quiet / tension",
    start: 0,
    end: 12,
    gradient: "linear-gradient(155deg, #08090b 0%, #14181d 48%, #1f1a17 100%)",
  },
  {
    id: "transition",
    label: "Transition",
    start: 12,
    end: 16,
    gradient: "linear-gradient(155deg, #10161e 0%, #243040 52%, #3b3225 100%)",
  },
  {
    id: "payoff",
    label: "Payoff",
    start: 16,
    end: 26,
    gradient: "linear-gradient(155deg, #16202c 0%, #3c4054 38%, #c8a24a 135%)",
  },
  {
    id: "cta",
    label: "CTA",
    start: 26,
    end: 30,
    gradient: "linear-gradient(155deg, #0c1116 0%, #1d2733 45%, #8a6f2f 130%)",
  },
];

/** When the CTA finishes fading in — the start of the final beat. */
export const HERO_CTA_REVEAL_AT = 26;

/** How long the CTA takes to fade up, in seconds. */
export const HERO_CTA_FADE = 1.2;

export type HeroCaption = {
  start: number;
  end: number;
  text: string;
};

/**
 * Burned-in captions, timed against the beats above. Placeholder copy — the
 * real lines come from the finished script. Kept in the DOM (not drawn into the
 * video) so they stay readable, translatable, and indexable.
 *
 * Note: the final caption runs to 25.5s while the CTA starts fading up at 24.8s
 * (HERO_CTA_REVEAL_AT minus HERO_CTA_FADE). That ~0.7s overlap is intentional —
 * it reads as a crossfade into the end card. Not a timing bug; leave it.
 */
export const HERO_CAPTIONS: HeroCaption[] = [
  { start: 1.5, end: 6.0, text: "Another repair bill you didn't see coming." },
  { start: 6.5, end: 11.5, text: "Out of pocket. Again." },
  { start: 12.5, end: 15.5, text: "It doesn't have to work like this." },
  { start: 16.5, end: 21.0, text: "Every Esteem vehicle comes with the Service Shield." },
  { start: 21.5, end: 25.5, text: "Covered, from the day you drive away." },
];

/** Index of the caption active at time `t`, or -1 between lines. */
export function captionIndexAt(t: number): number {
  return HERO_CAPTIONS.findIndex((c) => t >= c.start && t < c.end);
}

/** Index of the beat active at time `t`. Clamps to the last beat. */
export function beatIndexAt(t: number): number {
  const i = HERO_BEATS.findIndex((b) => t >= b.start && t < b.end);
  return i === -1 ? HERO_BEATS.length - 1 : i;
}

/** CTA opacity at time `t`, fading up over HERO_CTA_FADE seconds. */
export function ctaOpacityAt(t: number): number {
  if (t < HERO_CTA_REVEAL_AT - HERO_CTA_FADE) return 0;
  if (t >= HERO_CTA_REVEAL_AT) return 1;
  return (t - (HERO_CTA_REVEAL_AT - HERO_CTA_FADE)) / HERO_CTA_FADE;
}
