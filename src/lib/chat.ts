/**
 * Chat widget and click-to-call configuration (brief §4.4).
 *
 * Same pattern as the hero film: everything is built and working, with the
 * external dependency behind a single swappable constant. Empty values put the
 * feature into a graceful degraded state rather than shipping something broken.
 */

/**
 * The inbound number visitors call — the one Maren answers.
 *
 * Both fields must stay filled for the phone UI to render. The header call link
 * and the chat "call us instead" fallback hide themselves if either is empty,
 * because a wrong or half-formed number on a dealership site sends real
 * customers to a stranger.
 *
 * e164    — for the tel: href
 * display — what a human reads
 */
export const CALL_NUMBER = {
  e164: "+6498734667",
  display: "09 873 4667",
};

export function hasCallNumber(): boolean {
  return CALL_NUMBER.e164.length > 0 && CALL_NUMBER.display.length > 0;
}

/**
 * Retell credentials are deliberately NOT exposed here.
 *
 * RETELL_API_KEY and RETELL_AGENT_ID are read server-side only, in
 * integrations.ts. Neither carries the NEXT_PUBLIC_ prefix, so neither can end
 * up in the browser bundle. The widget learns whether chat is live from the
 * `stubbed` flag on each API response rather than from an env var, which means
 * the client never needs to know anything about the credentials at all.
 */

export const CHAT = {
  /** Trigger window from the brief — a random point inside it, per visitor. */
  triggerMinMs: 8000,
  triggerMaxMs: 12000,
  /** …or this far down the page, whichever comes first. */
  scrollTriggerRatio: 0.5,

  title: "Esteem",
  subtitle: "Usually replies during opening hours",
  openingMessage: "Hi — looking for something specific?",
  placeholder: "Type your message…",

  /**
   * Stub reply. Deliberately does NOT claim the message reached anyone,
   * because in stub mode it hasn't. It points at the channels that genuinely
   * work instead. Replace when the Retell agent exists.
   */
  stubReply:
    "Thanks for that. I'm not switched on just yet — the team is still setting me up, so nobody's read this yet. The quickest way to get a real answer right now is to call us or send an enquiry.",

  /**
   * Shown when Retell is configured but the request failed. Says what happened
   * without pretending the message landed, and points at the number, which
   * always works.
   */
  errorReply:
    "Sorry — I couldn't get that through just then. Give us a call and someone will pick up, or try again in a moment.",

  /** Shown once triggered, before the panel is opened. */
  teaserDismissLabel: "Dismiss",
};

/** Session key so a dismissed bubble stays dismissed while browsing. */
export const CHAT_DISMISSED_KEY = "esteem-chat-dismissed";
