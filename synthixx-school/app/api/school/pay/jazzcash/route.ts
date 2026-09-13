import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import {
  resolvePayable,
  createPaymentAttempt,
  jazzcashConfigured,
  jazzcashSecureHash,
} from "@/lib/school/payments";

export const runtime = "nodejs";

const SANDBOX_URL = "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
const LIVE_URL = "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

export async function GET() {
  return Response.json({ configured: jazzcashConfigured() });
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Initiate a JazzCash "Page Redirection" payment. Returns the gateway action URL
 * and signed form fields; the client auto-submits a form to redirect the user.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!jazzcashConfigured())
    return Response.json({ error: "JazzCash is not configured. Add JAZZCASH_* keys to .env.local." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const feeIds: string[] = Array.isArray(body?.feeIds) ? body.feeIds.map(String) : body?.feeId ? [String(body.feeId)] : [];

  const result = await resolvePayable(user.id, user.email ?? null, feeIds);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  const { ctx } = result;

  const txnRef = await createPaymentAttempt(ctx.schoolId, "jazzcash", ctx.total, ctx.feeIds);

  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const returnUrl = process.env.JAZZCASH_RETURN_URL || `${appUrl}/api/school/pay/jazzcash/callback`;

  const fields: Record<string, string> = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID!,
    pp_SubMerchantID: "",
    pp_Password: process.env.JAZZCASH_PASSWORD!,
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: txnRef,
    pp_Amount: String(Math.round(ctx.total * 100)), // amount in paisa
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: fmt(now),
    pp_BillReference: "schoolfee",
    pp_Description: `School fee payment (${ctx.feeIds.length})`,
    pp_TxnExpiryDateTime: fmt(expiry),
    pp_ReturnURL: returnUrl,
    ppmpf_1: ctx.schoolId,
    ppmpf_2: "",
    ppmpf_3: "",
    ppmpf_4: "",
    ppmpf_5: "",
  };

  fields.pp_SecureHash = jazzcashSecureHash(fields, process.env.JAZZCASH_INTEGRITY_SALT!);

  const action = process.env.JAZZCASH_LIVE === "1" ? LIVE_URL : SANDBOX_URL;
  return Response.json({ action, fields, method: "POST" });
}
