import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { cashmaalConfigured, cashmaalFormFields, CASHMAAL_PAY_URL, CASHMAAL_CURRENCY } from "@/lib/school/cashmaal";

export const runtime = "nodejs";

const VALID_PLANS = ["test", "starter", "growth", "enterprise"];
const PLAN_PRICES: Record<string, number> = {
  test: 100,
  starter: 5000,
  growth: 12000,
  enterprise: 25000,
};

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

    if (!cashmaalConfigured()) {
      return NextResponse.json({ error: "CashMaal is not configured. Set CASHMAAL_WEB_ID in environment variables." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = typeof body?.planId === "string" ? body.planId : "";
    const planName = typeof body?.planName === "string" ? body.planName : planId;

    if (!VALID_PLANS.includes(planId)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amount = PLAN_PRICES[planId];
    const schoolId = (member as { school_id?: string } | null)?.school_id ?? "unknown";
    const orderId = `SUB${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://school.synthixx.com";

    // Save payment attempt so IPN can find it and activate subscription
    await svc.from("fee_payments").insert({
      school_id: schoolId,
      gateway: "cashmaal",
      txn_ref: orderId,
      gateway_order_id: orderId,
      amount,
      status: "pending",
      currency: "PKR",
      payer_email: user.email ?? null,
      raw: { type: "subscription", planId, planName },
      initiated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const fields = cashmaalFormFields({
      amount,
      currency: CASHMAAL_CURRENCY,
      orderId,
      clientEmail: user.email ?? null,
      successUrl: `${baseUrl}/school/subscription?status=success&ref=${orderId}`,
      cancelUrl: `${baseUrl}/school/subscription?status=cancelled`,
      addiInfo: `Synthixx Campus ${planName} Plan — ${schoolId}`,
    });

    return NextResponse.json({
      action: CASHMAAL_PAY_URL,
      method: "POST",
      fields,
      orderId,
      amount,
    });
  } catch (e) {
    console.error("[Subscribe]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
