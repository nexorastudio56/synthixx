import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { markPaymentWithAudit } from "@/lib/school/payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = await createServiceClient();
    const { data: member } = await svc
      .from("school_users")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const role = (member as { role?: string } | null)?.role ?? "";
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const txnRef = typeof body?.txnRef === "string" ? (body.txnRef as string).trim() : "";
    const reason = typeof body?.reason === "string" ? (body.reason as string).trim() : "Bank transfer verified by admin";

    if (!txnRef) return NextResponse.json({ error: "txnRef required" }, { status: 400 });

    const ok = await markPaymentWithAudit("bank_transfer", txnRef, {
      adminEmail: user.email ?? undefined,
      reason,
    });

    if (!ok) return NextResponse.json({ error: "Payment not found or already processed" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[BankTransfer verify]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
