import { GoogleGenAI } from "@google/genai";

// Slim AI layer for the School/University app. It mirrors the small surface the
// school routes use from the main app's provider pipeline (`streamWithFallback`,
// `anyProviderConfigured`, `friendlyError`) but talks to Gemini directly, so the
// standalone app has no dependency on the main app's larger AI/settings tree.

type Tier = "pro" | "fast";

interface Part {
  type: "text";
  text: string;
}

interface Message {
  role: "user" | "assistant";
  parts: Part[];
}

interface GenerateOptions {
  system?: string;
  messages: Message[];
  maxTokens?: number;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "error"; message: string };

const MODELS: Record<Tier, string> = {
  pro: process.env.GEMINI_MODEL_PRO || "gemini-2.5-flash",
  fast: process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash",
};

/** Comma-separated key pool support, matching the main app's env convention. */
function geminiKeys(): string[] {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEYS ||
    process.env.GOOGLE_API_KEY ||
    "";
  return raw
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export function anyProviderConfigured(): boolean {
  return geminiKeys().length > 0;
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/quota|rate limit|429/i.test(msg))
    return "SchoolAI is busy right now. Please try again in a moment.";
  if (/api key|unauthorized|401|permission/i.test(msg))
    return "SchoolAI is not configured yet. Please try again later.";
  return "SchoolAI couldn't respond right now. Please try again.";
}

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota|rate limit|429|503|500|unavailable|overloaded|timeout|fetch failed/i.test(
    msg,
  );
}

function toContents(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.parts.map((p) => ({ text: p.text })),
  }));
}

/**
 * Stream a chat completion from Gemini, rotating across the key pool when a key
 * hits a transient/quota error before any output has been produced.
 */
export async function* streamWithFallback(params: {
  tier: Tier;
  opts: GenerateOptions;
}): AsyncGenerator<StreamEvent> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY is not set.");

  const model = MODELS[params.tier];
  const config: Record<string, unknown> = {
    maxOutputTokens: params.opts.maxTokens ?? 4096,
    systemInstruction: params.opts.system,
    thinkingConfig: { thinkingBudget: 0 },
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[attempt];
    let produced = false;
    try {
      const client = new GoogleGenAI({ apiKey: key });
      const stream = await client.models.generateContentStream({
        model,
        contents: toContents(params.opts.messages),
        config,
      });
      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.text) {
            produced = true;
            yield { type: "text", text: part.text };
          }
        }
      }
      return;
    } catch (err) {
      lastErr = err;
      if (!produced && attempt < keys.length - 1 && isTransient(err)) continue;
      throw err;
    }
  }
  if (lastErr) throw lastErr;
}
