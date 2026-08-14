/**
 * Finance section content: how-it-works, FAQ, and the legal disclaimer.
 *
 * Kept out of the quiz flow itself on purpose. The quiz should never feel like
 * a legal document — the compliance language sits quietly underneath it, here.
 */

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Answer five quick questions",
    body: "About 30 seconds, on your phone, no credit check. Ballpark answers are fine — nothing here needs to be exact.",
  },
  {
    step: "2",
    title: "We pass it to the team",
    body: "Your answers go straight to Esteem so someone can look at what might suit you, alongside our partner lenders.",
  },
  {
    step: "3",
    title: "Someone comes back to you",
    body: "A real person gets in touch to talk through your options. No obligation, and no pressure to buy anything.",
  },
];

export type FaqItem = { q: string; a: string };

/**
 * Plain answers, no hedging weasel-words. Note what these deliberately do NOT
 * say: nothing about approval odds, rates, or how likely anyone is to qualify.
 */
export const FINANCE_FAQ: FaqItem[] = [
  {
    q: "Will this affect my credit score?",
    a: "No. Answering these questions is not a credit application and we don't run a credit check to do it. If you later choose to apply for finance, the lender will tell you at that point what checks they need to run.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Getting pre-qualified is free, and there's no obligation to buy a vehicle or take out finance afterwards.",
  },
  {
    q: "What if my credit history isn't perfect?",
    a: "Still worth asking. Circumstances vary enormously and our partner lenders each assess things differently, so it's not a single yes-or-no. Tell the team your situation and they'll be straight with you about what's realistic.",
  },
  {
    q: "Am I committing to anything by filling this in?",
    a: "Not at all. You're asking a question, not signing anything. Nothing here is a finance application and nothing is binding on you or on us.",
  },
  {
    q: "What happens to my information?",
    a: "It goes to Esteem Car Traders so the team can get in touch about your enquiry. We don't sell it. If your enquiry goes further, we'll tell you before anything is shared with a lender.",
  },
  {
    q: "How soon will I hear back?",
    a: "The team aims to come back to you shortly after your answers arrive. If it's outside opening hours, it'll be the next working day.",
  },
];

/**
 * ⚠️ UNREVIEWED DRAFT — DO NOT SHIP AS-IS.
 *
 * This is a starting point for a New Zealand finance-introduction disclaimer,
 * written to be reviewed and rewritten by someone qualified. It is not legal
 * advice and has not been checked against the Credit Contracts and Consumer
 * Finance Act 2003, the Fair Trading Act 1986, or the Privacy Act 2020.
 *
 * Flip FINANCE_LEGAL_REVIEWED to true only once a lawyer has signed the wording
 * off. While it is false, a warning renders in development (never in
 * production) so this cannot be quietly forgotten.
 *
 * Points a reviewer will need to confirm at minimum:
 *  - that "introduction/referral service, not a lender" is accurate to how
 *    Esteem actually operates and how they are (or are not) registered
 *  - whether a financial advice provider / FSPR disclosure obligation applies
 *  - correct privacy wording for passing details to third-party lenders
 *  - that nothing anywhere in the funnel implies guaranteed approval or a rate
 */
export const FINANCE_LEGAL_REVIEWED = false;

export const FINANCE_DISCLAIMER = [
  "Esteem Car Traders is a motor vehicle dealer, not a lender. We introduce customers to third-party finance providers and do not make lending decisions ourselves.",
  "Completing the pre-qualification questions is not an application for credit and does not involve a credit check. It does not create any obligation on you, on Esteem Car Traders, or on any lender, and it is not an offer or approval of finance.",
  "Any finance is provided by a third-party lender on their own terms. All lending is subject to that lender's criteria, responsible lending obligations, and any applicable fees and interest, which the lender will disclose to you before you enter into a contract.",
  "Information you provide is collected by Esteem Car Traders to respond to your enquiry and is handled in accordance with our privacy policy. We will let you know before your details are passed to a finance provider.",
];
