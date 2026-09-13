import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { resolvePayable, createBankTransferAttempt } from "@/lib/school/payments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const feeIds: string[] = Array.isArray(body?.feeIds) ? (body.feeIds as string[]) : [];

    const resolved = await resolvePayable(user.id, user.email ?? null, feeIds);
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    const { ctx } = resolved;
    const txnRef = await createBankTransferAttempt(ctx.schoolId, ctx.total, ctx.feeIds, {
      payerEmail: ctx.email,
      studentId: ctx.studentId,
    });

    return NextResponse.json({ txnRef, amount: ctx.total });
  } catch (e) {
    console.error("[BankTransfer initiate]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
