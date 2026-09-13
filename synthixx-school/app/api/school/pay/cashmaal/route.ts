import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import {
  resolvePayable,
  createPaymentAttempt,
} from "@/lib/school/payments";
import {
  cashmaalConfigured,
  cashmaalFormFields,
  CASHMAAL_PAY_URL,
  CASHMAAL_CURRENCY,
} from "@/lib/school/cashmaal";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ configured: cashmaalConfigured() });
}

/**
 * Initiate a CashMaal hosted payment. Creates a pending fee_payments attempt
 * and returns the form fields for the client to auto-submit to cmaal.com/Pay/.
 * The order id (our txn reference) is carried in the success/cancel URLs.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!cashmaalConfigured())
    return Response.json({ error: "CashMaal is not configured. Add CASHMAAL_WEB_ID to .env.local." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const feeIds: string[] = Array.isArray(body?.feeIds) ? body.feeIds.map(String) : body?.feeId ? [String(body.feeId)] : [];

  const result = await resolvePayable(user.id, user.email ?? null, feeIds);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  const { ctx } = result;

  const txnRef = await createPaymentAttempt(ctx.schoolId, "cashmaal", ctx.total, ctx.feeIds, {
    payerEmail: ctx.email,
    studentId: ctx.studentId,
    currency: CASHMAAL_CURRENCY,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const returnUrl = `${appUrl}/api/school/pay/cashmaal/return?o=${encodeURIComponent(txnRef)}`;

  // pay_method is intentionally left blank so CashMaal shows the methods
  // actually enabled on this merchant account (JazzCash/EasyPaisa etc).
  const fields = cashmaalFormFields({
    amount: ctx.total,
    currency: CASHMAAL_CURRENCY,
    successUrl: returnUrl,
    cancelUrl: returnUrl,
    clientEmail: ctx.email,
    orderId: txnRef,
    addiInfo: `School fee payment (${ctx.feeIds.length} item${ctx.feeIds.length === 1 ? "" : "s"})`,
  });

  return Response.json({ action: CASHMAAL_PAY_URL, fields, method: "POST" });
}