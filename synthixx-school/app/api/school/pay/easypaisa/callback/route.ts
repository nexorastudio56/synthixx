import { type NextRequest } from "next/server";
import { markPaymentPaid } from "@/lib/school/payments";

export const runtime = "nodejs";

/**
 * EasyPaisa return/postback handler. EasyPaisa redirects/POSTs the result here.
 * On a successful status we mark the fees paid, then redirect the user back.
 */
async function handle(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const back = (state: string) => Response.redirect(`${appUrl}/school/parents?pay=${state}`, 303);

  const fields: Record<string, string> = {};
  try {
    if (request.method === "POST") {
      const form = await request.formData();
      form.forEach((v, k) => { fields[k] = String(v); });
    } else {
      request.nextUrl.searchParams.forEach((v, k) => { fields[k] = v; });
    }
  } catch {
    return back("failed");
  }

  const status = (fields.status || fields.paymentStatus || fields.responseCode || "").toUpperCase();
  const txnRef = fields.orderRefNum || fields.orderRefNumber || "";
  const ok = status === "0000" || status === "0" || status === "SUCCESS" || status === "PAID";

  if (ok && txnRef) {
    await markPaymentPaid("easypaisa", txnRef, fields);
    return back("success");
  }
  return back("failed");
}

export const POST = handle;
export const GET = handle;
