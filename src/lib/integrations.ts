/**
 * Single seam for every third-party integration (brief §10).
 *
 * Components must never call Retell / Make.com / a lender directly — they call
 * these functions. Swapping a stub for the real credentials then touches this
 * file only. Everything here is currently a stub: it validates shape, logs, and
 * returns a success envelope without hitting a network.
 */

import { QUIZ_STEPS } from "@/lib/finance-quiz";
import { CHAT } from "@/lib/chat";

export type LeadSource = "finance-quiz" | "chat" | "contact-form" | "vehicle-cta";

export type Lead = {
  name?: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  /** Slug of the vehicle in context, when the lead came from a vehicle page. */
  vehicleSlug?: string;
  /** Free-form quiz answers or chat metadata. */
  payload?: Record<string, unknown>;
};

/**
 * A banded numeric answer. The band is carried whole — id, human label and
 * bounds — so the CRM can group on the id, a human can read the label, and
 * anything downstream can do arithmetic without re-deriving the range.
 */
export type BandAnswer = {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
};

/**
 * The full finance quiz payload: all five answers as structured fields plus
 * contact details.
 *
 * Deliberately not just name/phone/email — a lead that arrives without the
 * answers attached would need a second pass to be useful, and the whole point
 * of asking is that the dealership can act on it.
 *
 * Replaces an earlier intent/budget shape from the first §6 sketch; the build
 * spec's five questions supersede it.
 */
export type FinanceQuizAnswers = {
  /** Q1 — full-time | part-time | self-employed | other */
  employment?: string;
  /** Q2 — weekly take-home after tax, banded. */
  weeklyIncome?: BandAnswer;
  /** Q3 — full-nz | restricted | overseas | other */
  licence?: string;
  /** Q4 — trading-in | starting-fresh */
  tradeIn?: string;
  /** Q4 follow-up — free text, always optional. */
  tradeInVehicle?: string;
  /** Q5 — weekly savings after bills, banded. */
  weeklySavings?: BandAnswer;

  name?: string;
  phone?: string;
  email?: string;

  /** Set when the quiz was opened from a vehicle page. */
  vehicleSlug?: string;
  /** ISO timestamp of submission, for CRM ordering. */
  submittedAt?: string;
};

export type IntegrationResult = {
  ok: boolean;
  /** True while running against a stub rather than a live integration. */
  stubbed: boolean;
  id?: string;
  message?: string;
};

const MAKE_LEADS_WEBHOOK = process.env.MAKE_LEADS_WEBHOOK_URL;
const MAKE_FINANCE_WEBHOOK = process.env.MAKE_FINANCE_WEBHOOK_URL;

/**
 * Marenly lead delivery — Marenly is Esteem's CRM, not a third-party broker.
 *
 * MAREN_LEAD_ENDPOINT is intentionally unset. The endpoint URL, auth scheme and
 * payload schema have not been confirmed, and finance leads carry customer PII
 * — name, phone, email, employment and income band — so posting them at a
 * guessed URL is not a mistake worth risking. Until the endpoint is set,
 * submitFinanceLead() stays in stub mode exactly as before.
 *
 * Auth is confirmed: an `x-api-key` header carrying MAREN_API_KEY, with
 * `content-type: application/json`. (An earlier draft assumed Bearer — it is
 * not.) The payload schema is still unconfirmed: we send our own field names.
 */
const MAREN_API_KEY = process.env.MAREN_API_KEY;
const MAREN_LEAD_ENDPOINT = process.env.MAREN_LEAD_ENDPOINT;

/** Routes a generic lead to Make.com → CRM. */
export async function submitLead(lead: Lead): Promise<IntegrationResult> {
  if (!MAKE_LEADS_WEBHOOK) {
    console.info("[stub] submitLead", lead);
    return { ok: true, stubbed: true, message: "MAKE_LEADS_WEBHOOK_URL not set — lead not sent." };
  }

  const res = await fetch(MAKE_LEADS_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(lead),
  });

  return { ok: res.ok, stubbed: false, message: res.ok ? undefined : `Webhook ${res.status}` };
}

/**
 * Normalises a New Zealand phone number to E.164 (+64…) so the CRM can dial and
 * deduplicate reliably. Verified against live data: Marenly stores whatever it
 * is given, so "021 123 4567" and "+64211234567" would otherwise sit in the
 * database as two different customers.
 *
 * Exported for testing.
 *
 * Deliberately conservative: anything it cannot confidently parse is returned
 * unchanged rather than mangled. A human-readable number a salesperson can
 * squint at beats a confidently wrong one they cannot call.
 */
export function toE164NZ(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Already international — strip formatting, keep the country code as given
  // (an Australian or UK customer is not ours to rewrite).
  if (trimmed.startsWith("+")) {
    const cleaned = "+" + trimmed.slice(1).replace(/\D/g, "");
    return cleaned.length >= 8 ? cleaned : trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  let national: string;
  if (digits.startsWith("0064")) national = digits.slice(4);
  else if (digits.startsWith("64") && digits.length >= 10) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;

  // Outside plausible NZ length — hand back what the customer typed.
  if (national.length < 7 || national.length > 11) return trimmed;

  return `+64${national}`;
}

/** Human label for a select answer, so the CRM shows "Full time", not "full-time". */
function labelFor(stepId: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const step = QUIZ_STEPS.find((s) => s.id === stepId);
  if (!step || step.kind !== "select") return value;
  return step.options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Maps our quiz answers onto Marenly's lead schema.
 *
 * Marenly uses snake_case names of its own (`caller_name`, `phone_number`,
 * `caller_email`, …), so posting FinanceQuizAnswers directly would create
 * malformed records. The contact mappings are certain. The rest are inferred
 * from the shape of existing records and should be confirmed with whoever owns
 * Marenly — see README open items.
 *
 * COMPLIANCE: Marenly has a `finance_preapproved` field. This flow must never
 * set it. Nothing has been assessed or approved at quiz submission — writing
 * that field would manufacture an approval that does not exist, which is
 * exactly what the §6 flag exists to prevent.
 */
function toMarenlyLead(a: FinanceQuizAnswers): Record<string, unknown> {
  const normalisedPhone = toE164NZ(a.phone);
  // If normalisation changed the number, keep what the customer actually typed
  // visible too — cheap insurance against the rewrite ever being wrong.
  const phoneNote =
    a.phone && normalisedPhone && normalisedPhone !== a.phone.trim()
      ? `\n\nPhone as entered: ${a.phone.trim()}`
      : "";

  const summary = [
    `Employment: ${labelFor("employment", a.employment) ?? "—"}`,
    `Weekly take-home (after tax): ${a.weeklyIncome?.label ?? "—"}`,
    `Licence: ${labelFor("licence", a.licence) ?? "—"}`,
    `Trade-in: ${labelFor("tradeIn", a.tradeIn) ?? "—"}${
      a.tradeInVehicle ? ` — ${a.tradeInVehicle}` : ""
    }`,
    `Weekly savings (after bills): ${a.weeklySavings?.label ?? "—"}`,
  ].join("\n");

  return {
    caller_name: a.name,
    phone_number: normalisedPhone,
    caller_email: a.email,
    // Set only when the quiz was opened from a specific vehicle.
    vehicle_interest: a.vehicleSlug || undefined,
    call_purpose: "Finance pre-qualification (website quiz)",
    source: "website-finance-quiz",
    previous_context: `Finance pre-qualification quiz completed on the website.\n\n${summary}${phoneNote}`,
    // created_at is deliberately NOT sent: it is a server-owned column, and we
    // POST on submission anyway, so Marenly's own timestamp is accurate.
  };
}

/**
 * Submits finance quiz answers for pre-qualification.
 *
 * Compliance (brief §6): whatever a real lender returns, the UI copy stays at
 * "check your options" / "likely" — never "guaranteed" or "approved" — until
 * the wording clears review against NZ Fair Trading Act rules.
 */
export async function submitFinanceLead(
  answers: FinanceQuizAnswers,
): Promise<IntegrationResult> {
  // Marenly takes precedence once it is fully configured. Both the key and the
  // endpoint are required — a key alone is not enough to know where to send.
  if (MAREN_LEAD_ENDPOINT && MAREN_API_KEY) {
    const res = await fetch(MAREN_LEAD_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": MAREN_API_KEY,
      },
      body: JSON.stringify(toMarenlyLead(answers)),
    });

    return {
      ok: res.ok,
      stubbed: false,
      message: res.ok ? undefined : `Marenly responded ${res.status}`,
    };
  }

  if (MAREN_API_KEY && !MAREN_LEAD_ENDPOINT) {
    console.warn(
      "[stub] submitFinanceLead — MAREN_API_KEY is set but MAREN_LEAD_ENDPOINT is not. " +
        "Not posting to a guessed URL.",
    );
  }

  const endpoint = MAKE_FINANCE_WEBHOOK ?? MAKE_LEADS_WEBHOOK;

  if (!endpoint) {
    console.info("[stub] submitFinanceLead", answers);
    return {
      ok: true,
      stubbed: true,
      message: "No finance endpoint configured — answers not sent.",
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "finance-quiz", ...answers }),
  });

  return { ok: res.ok, stubbed: false, message: res.ok ? undefined : `Webhook ${res.status}` };
}

/** Opens the Retell AI chat/booking widget. Client-side entry point. */
export function openChat(context?: { vehicleSlug?: string }): void {
  console.info("[stub] openChat", context ?? {});
}

/** Starts a chat session server-side, returning whatever the widget needs to connect. */
export async function createChatSession(context?: {
  vehicleSlug?: string;
}): Promise<IntegrationResult> {
  console.info("[stub] createChatSession", context ?? {});
  return { ok: true, stubbed: true, message: "Retell AI not yet configured." };
}

export type ChatReply = IntegrationResult & { reply: string; chatId?: string };

/**
 * Retell chat transport — the "Maren Chat" agent.
 *
 * Endpoints verified against the live API, not taken from docs: the API
 * reference and llms.txt disagreed on the path, and `/create-chat` is correct
 * while `/v2/create-chat` 404s.
 *
 *   POST /create-chat             { agent_id }        -> 201 { chat_id, … }
 *   POST /create-chat-completion  { chat_id, content } -> 200 { messages[] }
 *
 * The completion response mixes agent output with bookkeeping entries
 * (node_transition and tool-call rows), so only role === "agent" is surfaced.
 *
 * SERVER ONLY. Neither variable carries the NEXT_PUBLIC_ prefix, so the key
 * cannot reach the browser. Never import this into a client component.
 */
const RETELL_BASE = "https://api.retellai.com";

async function retell(path: string, body: unknown): Promise<Response> {
  return fetch(`${RETELL_BASE}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RETELL_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Sends a visitor message to the assistant and returns its reply.
 *
 * Creates the chat session on first message and hands the id back so the
 * widget can keep the conversation going — without it every message would be
 * a fresh chat with no memory of the last one.
 *
 * Falls back to CHAT.stubReply when unconfigured, and to a plain apology
 * pointing at the phone number when Retell errors. Neither ever claims a human
 * has seen the message.
 *
 * Deliberately NOT wired to submitLead(): lead delivery runs against a live
 * production CRM, and turning chat transcripts into CRM records is a scope
 * decision for a human.
 */
export async function sendChatMessage(
  text: string,
  context?: { vehicleSlug?: string; chatId?: string },
): Promise<ChatReply> {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || !agentId) {
    console.info("[stub] sendChatMessage", { text, ...(context ?? {}) });
    return {
      ok: true,
      stubbed: true,
      message: "Retell not configured — message logged only.",
      reply: CHAT.stubReply,
    };
  }

  try {
    let chatId = context?.chatId;

    if (!chatId) {
      const created = await retell("/create-chat", {
        agent_id: agentId,
        metadata: {
          source: "esteem-website",
          ...(context?.vehicleSlug ? { vehicle_slug: context.vehicleSlug } : {}),
        },
      });
      if (!created.ok) throw new Error(`create-chat ${created.status}`);
      chatId = ((await created.json()) as { chat_id: string }).chat_id;
    }

    const completion = await retell("/create-chat-completion", {
      chat_id: chatId,
      content: text,
    });
    if (!completion.ok) throw new Error(`create-chat-completion ${completion.status}`);

    const data = (await completion.json()) as {
      messages?: { role?: string; content?: string }[];
    };

    const reply = (data.messages ?? [])
      .filter((m) => m.role === "agent" && m.content)
      .map((m) => m.content as string)
      .join("\n\n")
      .trim();

    if (!reply) throw new Error("no agent message in completion response");

    return { ok: true, stubbed: false, reply, chatId };
  } catch (e) {
    console.error("[chat] Retell request failed:", e);
    return {
      ok: true,
      stubbed: false,
      message: e instanceof Error ? e.message : "unknown error",
      reply: CHAT.errorReply,
    };
  }
}
