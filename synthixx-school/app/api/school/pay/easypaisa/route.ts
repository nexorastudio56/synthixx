import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import {
  resolvePayable,
  createPaymentAttempt,
  easypaisaConfigured,
  easypaisaSecureHash,
} from "@/lib/school/payments";

export const runtime = "nodejs";

const CHECKOUT_URL = "https://easypay.easypaisa.com.pk/easypay/Index.jsf";

export async function GET() {
  return Response.json({ configured: easypaisaConfigured() });
}

function expiryDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Initiate an EasyPaisa hosted checkout. Returns the action URL and signed form
 * fields for the client to auto-submit.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!easypaisaConfigured())
    return Response.json({ error: "EasyPaisa is not configured. Add EASYPAISA_* keys to .env.local." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const feeIds: string[] = Array.isArray(body?.feeIds) ? body.feeIds.map(String) : body?.feeId ? [String(body.feeId)] : [];

  const result = await resolvePayable(user.id, user.email ?? null, feeIds);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  const { ctx } = result;

  const txnRef = await createPaymentAttempt(ctx.schoolId, "easypaisa", ctx.total, ctx.feeIds);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const postBackURL = process.env.EASYPAISA_RETURN_URL || `${appUrl}/api/school/pay/easypaisa/callback`;

  const fields: Record<string, string> = {
    storeId: process.env.EASYPAISA_STORE_ID!,
    orderRefNum: txnRef,
    amount: ctx.total.toFixed(2),
    postBackURL,
    expiryDate: expiryDate(),
    autoRedirect: "1",
    paymentMethod: "MA_PAYMENT_METHOD",
  };

  fields.merchantHashedReq = easypaisaSecureHash(fields, process.env.EASYPAISA_HASH_KEY!);

  return Response.json({ action: CHECKOUT_URL, fields, method: "POST" });
}
