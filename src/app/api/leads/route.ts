import { NextResponse } from "next/server";
import { submitLead, type Lead, type LeadSource } from "@/lib/integrations";

const SOURCES: LeadSource[] = ["finance-quiz", "chat", "contact-form", "vehicle-cta"];

/**
 * Webhook receiver → Make.com → CRM (brief §3).
 * Stubbed: forwards to submitLead(), which no-ops until the webhook URL is set.
 */
export async function POST(request: Request) {
  let body: Partial<Lead>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.source || !SOURCES.includes(body.source)) {
    return NextResponse.json(
      { ok: false, error: `source must be one of: ${SOURCES.join(", ")}` },
      { status: 400 },
    );
  }

  if (!body.phone && !body.email) {
    return NextResponse.json(
      { ok: false, error: "A phone or email is required." },
      { status: 400 },
    );
  }

  const result = await submitLead(body as Lead);

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
