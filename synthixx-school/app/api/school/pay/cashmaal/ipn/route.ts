import { type NextRequest } from "next/server";
import {
  getPaymentAttempt,
  markPaymentCancelled,
  markPaymentFailed,
} from "@/lib/school/payments";
import {
  cashmaalWebId,
  cashmaalVerify,
  amountsEqual,
  ipnKeyValid,
  finalizeCashmaalPayment,
  CASHMAAL_CURRENCY,
} from "@/lib/school/cashmaal";

export const runtime = "nodejs";

/**
 * CashMaal IPN webhook. CashMaal POSTs to the URL configured in your merchant
 * settings (add https://your-domain/api/school/pay/cashmaal/ipn there).
 *
 * Security per the official docs:
 *  • Match the configured ipn_key when CASHMAAL_IPN_KEY is set.
 *  • Verify web_id, order_id, Amount, currency.
 *  • When ipn_key is not configured, fall back to the documented verify_v2 API
 *    for additional confirmation (do not mark paid without either).
 *  • All checks are idempotent; duplicate callbacks are harmless.
 */
export async function POST(request: NextRequest) {
  const fields: Record<string, string> = {};
  try {
    const form = await request.formData();
    form.forEach((v, k) => { fields[k] = String(v); });
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const webId = cashmaalWebId();
  if (!webId) return new Response("web_id not configured", { status: 500 });

  const log = (msg: string) => console.log(`[CashMaal IPN] ${msg}`);
  const ack = (msg: string) => { log(msg); return new Response("ok", { status: 200 }); };

  // ── web_id ──────────────────────────────────────────────────────────────
  if (fields.web_id !== webId) return ack("web_id mismatch");

  // ── order_id → internal attempt ────────────────────────────────────────
  const orderId = (fields.order_id || "").trim();
  if (!orderId) return ack("missing order_id");
  const attempt = await getPaymentAttempt("cashmaal", orderId);
  if (!attempt) return ack("unknown order_id");
  if (attempt.status === "paid") return ack("already paid");

  // ── ipn_key (constant-time) ───────────────────────────────────────────
  const ipnKey = process.env.CASHMAAL_IPN_KEY;
  if (ipnKey && !ipnKeyValid(fields.ipn_key || "")) return ack("ipn_key mismatch");

  // ── status ─────────────────────────────────────────────────────────────
  const status = String(fields.status ?? "");
  if (status === "0") { await markPaymentCancelled("cashmaal", orderId, fields); return ack("cancelled by user"); }
  if (status === "3") { await markPaymentFailed("cashmaal", orderId, fields); return ack("rejected"); }
  if (status !== "1") return ack(`status=${status} (not final)`);

  // ── amount + currency ──────────────────────────────────────────────────
  const amount = Number(fields.Amount ?? fields.amount ?? "");
  if (Number.isNaN(amount) || !amountsEqual(amount, Number(attempt.amount)))
    return ack(`amount mismatch: got=${amount} expected=${attempt.amount}`);

  const currency = (fields.currency || attempt.currency || CASHMAAL_CURRENCY).toUpperCase();
  if (currency !== CASHMAAL_CURRENCY) return ack(`currency mismatch: ${currency}`);

  // ── Optional fallback: when ipn_key is not configured, confirm via verify_v2 ─
  if (!ipnKey) {
    const cmTid = (fields.CM_TID || "").trim();
    const v = cmTid ? await cashmaalVerify(cmTid, webId) : null;
    if (!v || String(v.status ?? "") !== "1") {
      log("ipn_key not configured; verify_v2 did not confirm — leaving pending");
      return new Response("pending", { status: 200 });
    }
  }

  await finalizeCashmaalPayment(orderId, (fields.CM_TID || "").trim() || null, fields);
  return ack("paid");
}