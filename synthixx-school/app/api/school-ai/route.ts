import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { streamWithFallback, anyProviderConfigured, friendlyError } from "@/lib/ai";
import { SCHOOL_AI_SYSTEM } from "@/lib/school/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Single AI endpoint for the School Management agent. Reuses Synthixx's
 * provider pipeline (Gemini primary, Anthropic fallback when configured).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
    if (!anyProviderConfigured())
      return Response.json(
        { error: "Synthixx AI is not configured yet. Please try again later." },
        { status: 503 },
      );

    const body = await request.json().catch(() => null);
    const systemPrompt = String(body?.systemPrompt ?? "").slice(0, 8000);
    const userMessage = String(body?.userMessage ?? "").slice(0, 24000);
    if (!userMessage.trim())
      return Response.json({ error: "Empty request" }, { status: 400 });

    const system = systemPrompt
      ? `${SCHOOL_AI_SYSTEM}\n\n${systemPrompt}`
      : SCHOOL_AI_SYSTEM;

    let text = "";
    for await (const ev of streamWithFallback({
      tier: "pro",
      opts: {
        system,
        messages: [{ role: "user", parts: [{ type: "text", text: userMessage }] }],
        maxTokens: 4096,
      },
    })) {
      if (ev.type === "text") text += ev.text;
    }

    return Response.json({ text: text.trim() });
  } catch (err) {
    console.error(
      "[school-ai] provider error:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: friendlyError(err) }, { status: 500 });
  }
}
