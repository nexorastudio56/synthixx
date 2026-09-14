import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_PLANS = ["starter", "growth", "enterprise"];
const PLAN_PRICES: Record<string, number> = {
  starter: 5000,
  growth: 12000,
  enterprise: 25000,
};

const VALID_METHODS = ["jazzcash", "easypaisa", "nayapay", "bank"];

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
      return NextResponse.json({ error: "Only admins can manage subscriptions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const planId       = typeof body?.planId       === "string" ? body.planId.trim()       : "";
    const planName     = typeof body?.planName     === "string" ? body.planName.trim()     : planId;
    const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod.trim() : "";
    const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : "";

    if (!VALID_PLANS.includes(planId))
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    if (!VALID_METHODS.includes(paymentMethod))
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

    if (!transactionId)
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });

    const amount   = PLAN_PRICES[planId];
    const schoolId = (member as { school_id?: string } | null)?.school_id ?? "unknown";
    const ref      = `SUB${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Save pending subscription payment
    await svc.from("fee_payments").insert({
      school_id:        schoolId,
      gateway:          paymentMethod,
      txn_ref:          ref,
      gateway_order_id: transactionId,
      amount,
      status:           "processing",
      currency:         "PKR",
      payer_email:      user.email ?? null,
      payment_method:   paymentMethod,
      raw: {
        type:          "subscription",
        planId,
        planName,
        transactionId,
        submittedAt:   new Date().toISOString(),
      },
      initiated_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    });

    console.log(`[Subscribe] Pending: plan=${planId} method=${paymentMethod} txn=${transactionId} school=${schoolId}`);

    return NextResponse.json({ success: true, ref });
  } catch (e) {
    console.error("[Subscribe]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
