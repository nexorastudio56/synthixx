import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const svc = await createServiceClient();
    const { data: member } = await svc
      .from("school_users")
      .select("school_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const role = (member as { role?: string } | null)?.role ?? "";
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const txnRef = typeof body?.txnRef === "string" ? body.txnRef.trim() : "";
    if (!txnRef) return NextResponse.json({ error: "txnRef required" }, { status: 400 });

    const schoolId = (member as { school_id?: string } | null)?.school_id ?? "";

    // Fetch the pending payment
    const { data: payment } = await svc
      .from("fee_payments")
      .select("*")
      .eq("school_id", schoolId)
      .eq("txn_ref", txnRef)
      .maybeSingle();

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "paid") return NextResponse.json({ error: "Already activated" }, { status: 409 });

    const raw = payment.raw as { type?: string; planId?: string; planName?: string } | null;
    if (raw?.type !== "subscription") return NextResponse.json({ error: "Not a subscription payment" }, { status: 400 });

    const planId = raw?.planId ?? "starter";
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Mark payment as paid
    await svc.from("fee_payments").update({
      status: "paid",
      marked_by: user.email ?? user.id,
      marked_at: now.toISOString(),
      mark_reason: "Admin verified manual payment",
      updated_at: now.toISOString(),
    }).eq("txn_ref", txnRef).eq("school_id", schoolId);

    // Activate subscription
    await svc.from("school_subscriptions").upsert({
      school_id:        schoolId,
      plan_id:          planId,
      status:           "active",
      amount:           Number(payment.amount),
      gateway:          payment.gateway,
      gateway_order_id: txnRef,
      activated_at:     now.toISOString(),
      expires_at:       expiresAt.toISOString(),
      updated_at:       now.toISOString(),
    }, { onConflict: "school_id" });

    console.log(`[Admin] Subscription activated: plan=${planId} school=${schoolId} by=${user.email}`);
    return NextResponse.json({ success: true, planId, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("[ActivateSubscription]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
