import { type NextRequest } from "next/server";
import { markPaymentPaid, jazzcashSecureHash } from "@/lib/school/payments";

export const runtime = "nodejs";

/**
 * JazzCash return/IPN handler. JazzCash POSTs the result here as form data.
 * We verify the secure hash, mark fees paid on success, then redirect the user.
 */
export async function POST(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const back = (state: string) => Response.redirect(`${appUrl}/school/parents?pay=${state}`, 303);

  const fields: Record<string, string> = {};
  try {
    const form = await request.formData();
    form.forEach((v, k) => { fields[k] = String(v); });
  } catch {
    return back("failed");
  }

  const salt = process.env.JAZZCASH_INTEGRITY_SALT;
  if (!salt) return back("failed");

  const received = fields.pp_SecureHash || "";
  const expected = jazzcashSecureHash(fields, salt);
  if (received.toUpperCase() !== expected.toUpperCase()) return back("failed");

  const success = fields.pp_ResponseCode === "000";
  const txnRef = fields.pp_TxnRefNo;
  if (success && txnRef) {
    await markPaymentPaid("jazzcash", txnRef, fields);
    return back("success");
  }
  return back("failed");
}

// Some gateways probe the return URL with GET.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return Response.redirect(`${appUrl}/school/parents`, 303);
}
