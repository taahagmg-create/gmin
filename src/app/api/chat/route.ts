import { NextResponse } from "next/server";
import { createChatSession, sendChatMessage } from "@/lib/integrations";

/**
 * Retell AI / bot session handler (brief §3, §4.4).
 *
 * Two shapes:
 *  - `{ vehicleSlug? }`          → open a session
 *  - `{ message, vehicleSlug? }` → send a visitor message, get a reply
 *
 * Message handling lives server-side so any Retell credentials stay off the
 * client. Stubbed until the Maren agent exists.
 */
export async function POST(request: Request) {
  let body: { message?: string; vehicleSlug?: string; chatId?: string } = {};

  try {
    body = await request.json();
  } catch {
    // An empty body is fine — chat can open without context.
  }

  if (typeof body.message === "string") {
    const text = body.message.trim();

    if (!text) {
      return NextResponse.json({ ok: false, error: "Message is empty." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ ok: false, error: "Message is too long." }, { status: 400 });
    }

    const result = await sendChatMessage(text, {
      vehicleSlug: body.vehicleSlug,
      chatId: body.chatId,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  const result = await createChatSession({ vehicleSlug: body.vehicleSlug });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
