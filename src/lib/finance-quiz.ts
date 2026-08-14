/**
 * Finance pre-qualification quiz definition (brief §6, quiz build spec).
 *
 * Every question, option, band and bridge line lives here. The components read
 * this and render it — so re-wording, re-ordering, or re-banding the quiz never
 * means touching JSX.
 *
 * The governing rule for everything below: it must read as though it is working
 * *for* the visitor, not assessing them. Two hard constraints follow from that
 * and are enforced in the components:
 *
 *  1. The two numeric questions must NEVER show a reaction to the value chosen.
 *     No praise, no warning, no colour shift, no helper text keyed to the band.
 *     Whatever someone picks, the UI looks identical.
 *  2. The result screen confirms submission only. Nothing is assessed at this
 *     stage, so nothing may imply an outcome — see FINANCE_RESULT.
 */

export type BandOption = {
  id: string;
  label: string;
  /** Inclusive lower bound in NZD/week. Null means open-ended below. */
  min: number | null;
  /** Exclusive upper bound in NZD/week. Null means open-ended above. */
  max: number | null;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type QuizStep =
  | {
      kind: "select";
      id: "employment" | "licence" | "tradeIn";
      question: string;
      /** Short warm lead-in shown as supporting copy under the question. */
      helper: string;
      options: SelectOption[];
      bridges: string[];
      /** Inline reveal shown when a particular option is chosen. Never blocking. */
      followUp?: {
        whenValue: string;
        prompt: string;
        placeholder: string;
      };
    }
  | {
      kind: "band";
      id: "weeklyIncome" | "weeklySavings";
      question: string;
      helper: string;
      bands: BandOption[];
      bridges: string[];
    };

export const WEEKLY_INCOME_BANDS: BandOption[] = [
  { id: "under-500", label: "Under $500", min: null, max: 500 },
  { id: "500-750", label: "$500 – $750", min: 500, max: 750 },
  { id: "750-1000", label: "$750 – $1,000", min: 750, max: 1000 },
  { id: "1000-1500", label: "$1,000 – $1,500", min: 1000, max: 1500 },
  { id: "1500-plus", label: "$1,500+", min: 1500, max: null },
];

export const WEEKLY_SAVINGS_BANDS: BandOption[] = [
  { id: "not-much", label: "Not much right now", min: null, max: 0 },
  { id: "under-50", label: "Under $50", min: 0, max: 50 },
  { id: "50-150", label: "$50 – $150", min: 50, max: 150 },
  { id: "150-300", label: "$150 – $300", min: 150, max: 300 },
  { id: "300-plus", label: "$300+", min: 300, max: null },
];

/**
 * The five questions, in order. Bridges are the short warm lines shown briefly
 * while advancing — they rotate so a repeat visitor doesn't get identical copy.
 */
export const QUIZ_STEPS: QuizStep[] = [
  {
    kind: "select",
    id: "employment",
    question: "Are you working full time at the moment, or more part time or something else?",
    helper: "No wrong answer here — we just need a rough picture.",
    options: [
      { value: "full-time", label: "Full time" },
      { value: "part-time", label: "Part time" },
      { value: "self-employed", label: "Self-employed" },
      { value: "other", label: "Something else" },
    ],
    bridges: ["Alright.", "Right, okay."],
  },
  {
    kind: "band",
    id: "weeklyIncome",
    question: "And roughly, what are you bringing home each week — after tax?",
    helper: "Even a ballpark is fine. Slide to whatever feels about right.",
    bands: WEEKLY_INCOME_BANDS,
    bridges: ["Alright.", "Right, okay."],
  },
  {
    kind: "select",
    id: "licence",
    question: "What type of licence are you on?",
    helper: "Full NZ, restricted, overseas — whichever applies.",
    options: [
      { value: "full-nz", label: "Full NZ" },
      { value: "restricted", label: "Restricted" },
      { value: "overseas", label: "Overseas" },
      { value: "other", label: "Something else" },
    ],
    bridges: ["Good to know.", "Yeah, sweet."],
  },
  {
    kind: "select",
    id: "tradeIn",
    question: "Do you have a vehicle you'd look to trade in at the same time, or starting fresh?",
    helper: "Either way works — it just helps us line things up.",
    options: [
      { value: "trading-in", label: "Yes, trading in" },
      { value: "starting-fresh", label: "Starting fresh" },
    ],
    followUp: {
      whenValue: "trading-in",
      prompt: "Oh nice — what is it? Make and year if you know.",
      placeholder: "e.g. 2014 Mazda Axela (optional)",
    },
    bridges: ["That is handy.", "Right, okay."],
  },
  {
    kind: "band",
    id: "weeklySavings",
    question: "And just roughly — how much do you put aside each week after bills?",
    helper: "A general sense is plenty. This is only ever a ballpark.",
    bands: WEEKLY_SAVINGS_BANDS,
    bridges: ["Alright.", "That is helpful.", "Good to know."],
  },
];

/** Questions plus the contact step — what the percentage counter measures. */
export const QUIZ_TOTAL_STEPS = QUIZ_STEPS.length + 1;

/** How long a bridge line sits on screen before the next question appears. */
export const BRIDGE_MS = 850;

/**
 * Shown before Q1. The job of this screen is for someone to think "oh, that's
 * me, that's easy" before they have done anything at all.
 */
export const QUIZ_INTRO = {
  headline: "Most people qualify",
  body: "Five quick questions about your situation — about 30 seconds. No credit check, and nothing here affects your credit score.",
  points: ["You're 18 or over", "You live in New Zealand", "You've got regular income coming in"],
  cta: "Start — 30 seconds",
  footnote: "Free, and there's no obligation to buy anything.",
};

/**
 * Contact capture. `required` is config so the friction level is a one-line
 * decision rather than something buried in validation code.
 *
 * Currently: all three required. Email gives the CRM a second channel and a
 * stable identity for follow-up, which is worth the small cost in completions.
 */
export const CONTACT_FIELDS = [
  {
    name: "name" as const,
    label: "Your name",
    type: "text",
    autoComplete: "name",
    placeholder: "First and last",
    required: true,
  },
  {
    name: "phone" as const,
    label: "Best number to reach you",
    type: "tel",
    autoComplete: "tel",
    placeholder: "021 123 4567",
    required: true,
  },
  {
    name: "email" as const,
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
    required: true,
  },
];

export const CONTACT_STEP = {
  question: "Last bit — how should the team reach you?",
  helper: "So someone can come back to you with your options. No spam, ever.",
  cta: "Send my answers",
};

/**
 * Submission confirmation ONLY.
 *
 * Nothing has been assessed at this point — no lender has seen anything — so
 * this must not imply an outcome. No "pre-qualified", no "likely", no odds, no
 * timeline beyond "shortly". Read the §6 compliance flag before editing.
 */
export const FINANCE_RESULT = {
  headline: "Congratulations!",
  body: "Your answers have been sent to the dealership for review. We'll send you a confirmation shortly.",
  footnote: "Keep an eye on your phone — that's usually how the team gets in touch first.",
};

/** Trust microcopy carried by every CTA that opens the quiz. */
export const QUIZ_TRUST_POINTS = ["No credit check", "30 seconds", "Free"];

/** Pick a bridge line, varying across visits without being random per render. */
export function pickBridge(bridges: string[], seed: number): string {
  return bridges[seed % bridges.length];
}
