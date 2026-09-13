// Client + shared AI helpers for the School Management agent.
// All Claude/Gemini calls go through the single /api/school-ai endpoint,
// which reuses Synthixx's provider pipeline (Gemini now, Claude when a key
// is added).

export const SCHOOL_AI_SYSTEM = `You are SchoolAI, an intelligent school management assistant built into the Synthixx platform. You help school administrators, teachers, and principals make better decisions. Be concise, practical, and well-structured. When the user writes in Urdu or Roman Urdu, reply in the same language; otherwise reply in English. Never invent data — only reason about the data you are given. Never mention any underlying AI provider; you are simply "SchoolAI".`;

/** Send a one-shot request to the school AI endpoint and get the text back. */
export async function getAIInsight(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const res = await fetch("/api/school-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userMessage }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "AI request failed");
  return (data?.text as string) || "";
}

/**
 * Stream an answer from the live-data assistant (/api/school-ai/query).
 * Calls onChunk for each text delta. The server resolves the school + data.
 */
export async function streamSchoolAI(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (delta: string) => void,
): Promise<void> {
  const res = await fetch("/api/school-ai/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "AI request failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type === "text" && ev.text) onChunk(ev.text);
        else if (ev.type === "error") throw new Error(ev.message || "AI error");
      } catch {
        /* ignore malformed line */
      }
    }
  }
}
