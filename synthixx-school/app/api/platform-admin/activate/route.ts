import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const txnRef  = searchParams.get("txnRef")  ?? "";
  const schoolId = searchParams.get("schoolId") ?? "";

  if (!txnRef || !schoolId) {
    return NextResponse.json({ error: "txnRef and schoolId required" }, { status: 400 });
  }

  const svc = await createServiceClient();

  const { data: payment } = await svc
    .from("fee_payments")
    .select("*")
    .eq("txn_ref", txnRef)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ error: "Already activated" }, { status: 409 });

  const raw    = payment.raw as { planId?: string } | null;
  const planId = raw?.planId ?? "starter";
  const now    = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + 1);

  await svc.from("fee_payments").update({
    status:     "paid",
    marked_by:  user.email,
    marked_at:  now.toISOString(),
    mark_reason:"Platform admin verified",
    updated_at: now.toISOString(),
  }).eq("txn_ref", txnRef);

  await svc.from("school_subscriptions").upsert({
    school_id:        schoolId,
    plan_id:          planId,
    status:           "active",
    amount:           Number(payment.amount),
    gateway:          payment.gateway,
    gateway_order_id: txnRef,
    activated_at:     now.toISOString(),
    expires_at:       expiry.toISOString(),
    updated_at:       now.toISOString(),
  }, { onConflict: "school_id" });

  console.log(`[PlatformAdmin] Activated: plan=${planId} school=${schoolId}`);

  // Redirect back to dashboard
  return NextResponse.redirect(new URL("/platform-admin", req.url));
}
