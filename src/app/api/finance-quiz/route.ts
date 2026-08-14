import { NextResponse } from "next/server";
import { submitFinanceLead, type FinanceQuizAnswers } from "@/lib/integrations";

/**
 * Finance quiz submission handler (brief §3, §6).
 *
 * This endpoint acknowledges receipt. It does not assess anything, because
 * nothing is assessed at this stage — no lender has seen the answers. So the
 * response deliberately carries no outcome, no odds, and no rate. An earlier
 * version returned `outcome: "options-available"`, which read as a verdict;
 * that has been removed.
 *
 * Result copy lives client-side in FINANCE_RESULT so there is one place to
 * review it. See the §6 compliance flag before changing any of this.
 */
export async function POST(request: Request) {
  let answers: FinanceQuizAnswers;

  try {
    answers = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!answers.phone && !answers.email) {
    return NextResponse.json(
      { ok: false, error: "A phone or email is required on the final step." },
      { status: 400 },
    );
  }

  if (!answers.name) {
    return NextResponse.json({ ok: false, error: "A name is required." }, { status: 400 });
  }

  const result = await submitFinanceLead({
    ...answers,
    submittedAt: answers.submittedAt ?? new Date().toISOString(),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  // Receipt only.
  return NextResponse.json({ ...result, received: true });
}
