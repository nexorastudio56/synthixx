import "server-only";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getPaymentAttempt,
  markPaymentPaid,
} from "@/lib/school/payments";

// Official CashMaal endpoints — https://www.cashmaal.com/api
export const CASHMAAL_PAY_URL = "https://cmaal.com/Pay/";
export const CASHMAAL_VERIFY_URL = "https://api.cmaal.com/verify_v2";
export const CASHMAAL_CURRENCY = "PKR";

export function cashmaalConfigured(): boolean {
  return !!process.env.CASHMAAL_WEB_ID;
}

export function cashmaalWebId(): string | null {
  return process.env.CASHMAAL_WEB_ID || null;
}

export interface CashmaalFormInput {
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  clientEmail?: string | null;
  orderId: string;
  addiInfo?: string;
  payMethod?: string;
}

/** Build the hidden form fields for POST https://cmaal.com/Pay/. */
export function cashmaalFormFields(input: CashmaalFormInput): Record<string, string> {
  const webId = process.env.CASHMAAL_WEB_ID;
  if (!webId) throw new Error("CASHMAAL_WEB_ID is not configured");
  const fields: Record<string, string> = {
    amount: String(Number(input.amount).toFixed(2)),
    currency: input.currency ?? CASHMAAL_CURRENCY,
    succes_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_email: input.clientEmail ?? "",
    web_id: webId,
    order_id: input.orderId.slice(0, 80),
    addi_info: (input.addiInfo ?? "School fee payment").slice(0, 80),
  };
  if (input.payMethod) fields.pay_method = input.payMethod;
  return fields;
}

/** GET https://api.cmaal.com/verify_v2?CM_TID=…&web_id=… */
export async function cashmaalVerify(
  cmTid: string,
  webId: string,
  timeoutMs = 10000,
): Promise<Record<string, unknown> | null> {
  if (!cmTid || !webId) return null;
  const url = `${CASHMAAL_VERIFY_URL}?CM_TID=${encodeURIComponent(cmTid)}&web_id=${encodeURIComponent(webId)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ac.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Loose numeric comparison (CashMaal may send "2000" or "2000.00"). */
export function amountsEqual(a: unknown, b: number, tolerance = 0.01): boolean {
  if (a === null || a === undefined || a === "") return false;
  const n = Number(a);
  if (Number.isNaN(n)) return false;
  return Math.abs(n - b) < tolerance;
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && A.length > 0 && crypto.timingSafeEqual(A, B);
}

/** Constant-time ipn_key check against the configured value. */
export function ipnKeyValid(received: string): boolean {
  const expected = process.env.CASHMAAL_IPN_KEY;
  if (!received || !expected) return false;
  return safeEqual(received, expected);
}

export type FinalizeState = "paid" | "already-paid" | "unknown";

/**
 * Idempotently mark a CashMaal attempt paid (fees -> paid, txn enriched) and
 * record an in-app notification for the parent portal. Amount/currency must
 * have been validated by the caller before invoking this.
 */
export async function finalizeCashmaalPayment(
  orderId: string,
  cmTid: string | null,
  body: Record<string, unknown>,
): Promise<FinalizeState> {
  const attempt = await getPaymentAttempt("cashmaal", orderId);
  if (!attempt) return "unknown";
  if (attempt.status === "paid") return "already-paid";
  const paid = await markPaymentPaid("cashmaal", orderId, body, {
    gatewayTransactionId: cmTid ?? null,
    paymentMethod: attempt.payment_method ?? null,
  });
  if (paid) await insertFeePaidNotification(attempt);
  return "paid";
}

async function insertFeePaidNotification(attempt: {
  school_id: string;
  student_id?: string | null;
  raw?: unknown;
}): Promise<void> {
  try {
    const feeIds = ((attempt.raw as { feeIds?: string[] } | null)?.feeIds ?? []) as string[];
    let label = "Fee";
    if (feeIds.length > 0) {
      const svc = createServiceClient();
      const { data } = await svc.from("fees").select("month").in("id", feeIds);
      const months = (data ?? []).map((f) => (f as { month: string | null }).month).filter(Boolean);
      if (months.length) label = months.join(", ");
    }
    const svc = createServiceClient();
    await svc.from("notifications").insert({
      school_id: attempt.school_id,
      type: "Fee Payment",
      message: `Payment received (CashMaal) — ${label} marked paid.`,
      recipient_type: "parent",
      recipient_id: attempt.student_id ?? null,
      channel: "in_app",
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[CashMaal] failed to insert payment notification", e);
  }
}