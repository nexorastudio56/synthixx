import "server-only";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export type Gateway = "jazzcash" | "easypaisa" | "cashmaal" | "bank_transfer";

export interface PayableContext {
  schoolId: string;
  feeIds: string[];
  total: number;
  email: string | null;
  studentId: string | null;
}

/**
 * Resolve the fees a signed-in user is allowed to pay. Parents are restricted
 * to their own child's fees. Returns null with an error string on failure.
 */
export async function resolvePayable(
  userId: string,
  email: string | null,
  feeIds: string[],
): Promise<{ ctx: PayableContext } | { error: string; status: number }> {
  const svc = createServiceClient();
  const { data: member } = await svc
    .from("school_users")
    .select("school_id, role, student_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!member) return { error: "No school", status: 403 };
  const schoolId = member.school_id as string;

  if (feeIds.length === 0) return { error: "No fees selected", status: 400 };

  const { data: fees } = await svc
    .from("fees")
    .select("id, student_id, amount, status, month")
    .eq("school_id", schoolId)
    .in("id", feeIds);

  let payable = (fees ?? []).filter((f) => f.status !== "paid");
  if (member.role === "PARENT") {
    payable = payable.filter((f) => f.student_id === member.student_id);
  }
  if (payable.length === 0) return { error: "Nothing to pay", status: 400 };

  const total = payable.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  if (total <= 0) return { error: "Amount must be greater than zero", status: 400 };

  return { ctx: { schoolId, feeIds: payable.map((f) => f.id), total, email, studentId: member.student_id ?? null } };
}

/** Options for recording a payment attempt. */
export interface PaymentAttemptOptions {
  payerEmail?: string | null;
  studentId?: string | null;
  currency?: string;
  paymentMethod?: string | null;
}

/** Record a pending payment attempt and return its txn reference (order id). */
export async function createPaymentAttempt(
  schoolId: string,
  gateway: Gateway,
  amount: number,
  feeIds: string[],
  opts: PaymentAttemptOptions = {},
): Promise<string> {
  const svc = createServiceClient();
  const prefix = gateway === "jazzcash" ? "JC" : gateway === "easypaisa" ? "EP" : gateway === "bank_transfer" ? "BT" : "CM";
  const txnRef = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await svc.from("fee_payments").insert({
    school_id: schoolId,
    gateway,
    txn_ref: txnRef,
    amount,
    status: "pending",
    raw: { feeIds },
    fee_id: feeIds[0] ?? null,
    student_id: opts.studentId ?? null,
    payer_email: opts.payerEmail ?? null,
    currency: opts.currency ?? "PKR",
    payment_method: opts.paymentMethod ?? null,
    gateway_order_id: txnRef,
    initiated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return txnRef;
}

/** Create a bank-transfer attempt (status=processing; awaiting admin verification). */
export async function createBankTransferAttempt(
  schoolId: string,
  amount: number,
  feeIds: string[],
  opts: PaymentAttemptOptions = {},
): Promise<string> {
  const svc = createServiceClient();
  const txnRef = `BT${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await svc.from("fee_payments").insert({
    school_id: schoolId,
    gateway: "bank_transfer",
    txn_ref: txnRef,
    amount,
    status: "processing",
    raw: { feeIds },
    fee_id: feeIds[0] ?? null,
    student_id: opts.studentId ?? null,
    payer_email: opts.payerEmail ?? null,
    currency: opts.currency ?? "PKR",
    payment_method: "Bank Transfer",
    gateway_order_id: txnRef,
    initiated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return txnRef;
}

/** Look up one payment attempt by gateway + txn reference (order id). */
export async function getPaymentAttempt(gateway: Gateway, txnRef: string) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("fee_payments")
    .select("*")
    .eq("gateway", gateway)
    .eq("txn_ref", txnRef)
    .maybeSingle();
  return data ?? null;
}

/** Mark a payment attempt + its fees as paid (idempotent). */
export async function markPaymentPaid(
  gateway: Gateway,
  txnRef: string,
  raw: Record<string, unknown>,
  opts: { gatewayTransactionId?: string | null; paymentMethod?: string | null } = {},
): Promise<boolean> {
  const svc = createServiceClient();
  const { data: attempt } = await svc
    .from("fee_payments")
    .select("id, school_id, status, raw, payment_method, gateway_transaction_id")
    .eq("gateway", gateway)
    .eq("txn_ref", txnRef)
    .maybeSingle();
  if (!attempt) return false;
  if (attempt.status === "paid") return true; // already processed

  const feeIds: string[] = Array.isArray((attempt.raw as { feeIds?: string[] })?.feeIds)
    ? (attempt.raw as { feeIds: string[] }).feeIds
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  if (feeIds.length > 0) {
    await svc.from("fees").update({ status: "paid", paid_date: today }).in("id", feeIds);
  }
  await svc
    .from("fee_payments")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
      gateway_transaction_id: opts.gatewayTransactionId ?? attempt.gateway_transaction_id ?? null,
      payment_method: opts.paymentMethod ?? attempt.payment_method ?? null,
      raw: { ...(attempt.raw as object), callback: raw },
    })
    .eq("id", attempt.id);
  return true;
}

/** Mark a payment with audit trail (admin manual marking). */
export async function markPaymentWithAudit(
  gateway: Gateway,
  txnRef: string,
  opts: { adminEmail?: string; reason?: string } = {},
): Promise<boolean> {
  const attempt = await getPaymentAttempt(gateway, txnRef);
  if (!attempt) return false;
  if (attempt.status === "paid") return true;

  const feeIds: string[] = Array.isArray((attempt.raw as { feeIds?: string[] })?.feeIds)
    ? (attempt.raw as { feeIds: string[] }).feeIds
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  if (feeIds.length > 0) {
    await createServiceClient().from("fees").update({ status: "paid", paid_date: today }).in("id", feeIds);
  }

  const result = await createServiceClient()
    .from("fee_payments")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
      marked_by: opts.adminEmail ?? null,
      marked_at: now,
      mark_reason: opts.reason ?? null,
    })
    .eq("id", attempt.id);

  return !result.error;
}

/** Mark a payment attempt as cancelled (idempotent; never un-pays fees). */
export async function markPaymentCancelled(
  gateway: Gateway,
  txnRef: string,
  raw: Record<string, unknown> = {},
): Promise<boolean> {
  const attempt = await getPaymentAttempt(gateway, txnRef);
  if (!attempt) return false;
  if (attempt.status === "paid") return true;
  const result = await createServiceClient()
    .from("fee_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw: { ...(attempt.raw as object), callback: raw },
    })
    .eq("id", attempt.id);
  return !result.error;
}

/** Mark a payment attempt as failed (idempotent; never un-pays fees). */
export async function markPaymentFailed(
  gateway: Gateway,
  txnRef: string,
  raw: Record<string, unknown> = {},
): Promise<boolean> {
  const attempt = await getPaymentAttempt(gateway, txnRef);
  if (!attempt) return false;
  if (attempt.status === "paid") return true;
  const result = await createServiceClient()
    .from("fee_payments")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw: { ...(attempt.raw as object), callback: raw },
    })
    .eq("id", attempt.id);
  return !result.error;
}

/* --------------------------- JazzCash helpers --------------------------- */

export function jazzcashConfigured(): boolean {
  return !!(process.env.JAZZCASH_MERCHANT_ID && process.env.JAZZCASH_PASSWORD && process.env.JAZZCASH_INTEGRITY_SALT);
}

/** JazzCash secure hash: HMAC-SHA256 over salt + '&' + sorted non-empty values. */
export function jazzcashSecureHash(fields: Record<string, string>, salt: string): string {
  const sortedKeys = Object.keys(fields).filter((k) => k !== "pp_SecureHash" && fields[k] !== "").sort();
  const str = salt + "&" + sortedKeys.map((k) => fields[k]).join("&");
  return crypto.createHmac("sha256", salt).update(str).digest("hex").toUpperCase();
}

/* --------------------------- EasyPaisa helpers -------------------------- */

export function easypaisaConfigured(): boolean {
  return !!(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY);
}

/** EasyPaisa hashed request: HMAC-SHA256 of sorted key=value pairs. */
export function easypaisaSecureHash(fields: Record<string, string>, key: string): string {
  const sortedKeys = Object.keys(fields).filter((k) => fields[k] !== "").sort();
  const str = sortedKeys.map((k) => `${k}=${fields[k]}`).join("&");
  return crypto.createHmac("sha256", key).update(str).digest("base64");
}
