import { type NextRequest } from "next/server";
import {
  getPaymentAttempt,
  markPaymentCancelled,
} from "@/lib/school/payments";
import {
  cashmaalVerify,
  cashmaalWebId,
  amountsEqual,
  finalizeCashmaalPayment,
} from "@/lib/school/cashmaal";

export const runtime = "nodejs";

/**
 * CashMaal user-facing success/cancel return. This page is NEVER trusted on
 * its own: payment is confirmed server-side via the documented verify_v2 API
 * (or by the /ipn endpoint). We only reflect the confirmed state to the user.
 */
async function handle(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const back = (state: string) => Response.redirect(`${appUrl}/school/parents?pay=${state}`, 303);

  const fields: Record<string, string> = {};
  if (request.method === "POST") {
    try {
      const form = await request.formData();
      form.forEach((v, k) => { fields[k] = String(v); });
    } catch {
      // fall through to query params
    }
  }
  request.nextUrl.searchParams.forEach((v, k) => { fields[k] = v; });

  const cmTid = (fields.CM_TID || fields.cm_tid || fields.transaction_id || "").trim();
  const orderId = (fields.order_id || fields.o || "").trim();

  if (!cmTid) {
    // No transaction id returned (e.g. user abandoned/cancelled).
    if (orderId) await markPaymentCancelled("cashmaal", orderId, fields);
    return back("cancelled");
  }

  const webId = cashmaalWebId();
  if (!webId) return back("processing");

  // Authoritative server-side check of the received transaction.
  const v = await cashmaalVerify(cmTid, webId);
  if (!v) return back("processing"); // could not confirm right now; IPN finalizes

  const status = String(v.status ?? "");

  if (status === "1") {
    const resolvedOrder = orderId || String(v.order_id ?? "").trim();
    if (resolvedOrder) {
      const attempt = await getPaymentAttempt("cashmaal", resolvedOrder);
      const received = v.PKR_amount ?? v.Amount ?? v.amount;
      const ok = !!attempt && !!attempt.status && attempt.status !== "cancelled" && amountsEqual(received, Number(attempt.amount));
      if (!ok) return back("failed"); // unknown order or amount mismatch: never mark paid
      await finalizeCashmaalPayment(resolvedOrder, cmTid, fields);
    }
    return back("success");
  }
  if (status === "2") return back("processing");
  return back("failed");
}

export const POST = handle;
export const GET = handle;