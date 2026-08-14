/**
 * Offer strip content and pacing (brief §4.2).
 *
 * Two to three offers, auto-rotating — explicitly not a static banner. Copy and
 * timing live here so the strip can be re-sequenced without touching component
 * code, and so whoever maintains the offers never has to read JSX.
 *
 * Compliance (§6): finance copy stays at "check your options" / "likely".
 * Nothing here may imply guaranteed approval or quote a rate.
 */

export type Offer = {
  id: string;
  /** Small label above the headline. */
  eyebrow: string;
  headline: string;
  body: string;
  href: string;
  /** Link text. Ignored when usePreQualifyCta is set. */
  cta: string;
  /** Backdrop gradient for the card. */
  accent: string;
  /**
   * Render the shared pre-qualify pill instead of a plain link, so the finance
   * offer matches the hero end card and the sticky CTA exactly.
   */
  usePreQualifyCta?: boolean;
};

/** Dwell time per offer. Long enough to read the body copy without hurrying. */
export const OFFER_ROTATE_MS = 6500;

export const OFFERS: Offer[] = [
  {
    id: "service-shield",
    eyebrow: "Included with every vehicle",
    headline: "The Esteem Service Shield",
    body: "A breakdown shouldn't come out of your pocket. Every car we sell is covered from the day you drive away.",
    href: "/service-shield",
    cta: "See what's covered",
    accent: "from-[#1b2735] via-[#243040] to-[#3b3225]",
  },
  {
    id: "stock-specials",
    eyebrow: "This month",
    headline: "Current stock specials",
    body: "Fresh arrivals and sharpened prices across both yards — Takanini and New Lynn.",
    href: "/inventory",
    cta: "Browse the range",
    accent: "from-[#16202c] via-[#2b3444] to-[#4a4030]",
  },
  {
    id: "finance",
    eyebrow: "No pressure",
    headline: "Check your finance options",
    body: "Thirty seconds, a few questions, and no impact on your credit score. See what our partner lenders can look at.",
    href: "/finance",
    cta: "Get pre-qualified",
    accent: "from-[#141a20] via-[#26303d] to-[#6b5527]",
    usePreQualifyCta: true,
  },
];
