"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Bot, Sparkles, Mic } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { streamSchoolAI } from "@/lib/school/ai";
import { PageHeader, Spinner } from "@/components/school/ui";

/* Minimal Web Speech API types (no dependency). */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface Msg { role: "user" | "assistant"; content: string }

const EXAMPLES = [
  "Kitne students ki fees pending hain?",
  "Class 5 ki attendance report do",
  "Top 10 students by marks batao",
  "Kis student ki attendance 60% se kam hai?",
  "Ali Raza ka overall result aur fee status?",
  "Which students need attention?",
];

export default function AIAssistantPage() {
  return (
    <ModuleGuard module="ai-assistant">
      <AIAssistantView />
    </ModuleGuard>
  );
}

function AIAssistantView() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const toggleVoice = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((cur) => [...cur, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      let acc = "";
      await streamSchoolAI(q, history, (delta) => {
        acc += delta;
        setMessages((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      });
      if (!acc) {
        setMessages((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", content: "(no response)" };
          return copy;
        });
      }
    } catch (err) {
      setMessages((cur) => {
        const copy = [...cur];
        copy[copy.length - 1] = { role: "assistant", content: err instanceof Error ? err.message : "Something went wrong." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="AI Assistant" description="Ask about your school data in English or Urdu." />

      <div className="flex h-[calc(100dvh-220px)] flex-col rounded-xl border border-border bg-surface">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Bot className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium">Ask me anything about your school</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => send(ex)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:bg-accent-soft hover:text-foreground">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.filter((m) => m.content || m.role === "user").map((m, i, arr) => {
            const isStreaming = busy && m.role === "assistant" && i === arr.length - 1;
            return (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-accent text-accent-fg" : "bg-background"} ${isStreaming ? "sk-caret" : ""}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {busy && !messages[messages.length - 1]?.content && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="h-4 w-4" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-border p-3">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={listening ? "Listening…" : "Type your question…"} className="flex-1 bg-transparent text-sm outline-none" />
          {voiceSupported && (
            <button type="button" onClick={toggleVoice} className={`rounded-lg p-2 ${listening ? "bg-danger/15 text-danger" : "text-muted hover:bg-accent-soft"}`} aria-label="Voice input" title="Voice input">
              <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
            </button>
          )}
          <button type="submit" disabled={busy || !input.trim()} className="sk-press rounded-lg bg-accent p-2 text-accent-fg hover:opacity-90 disabled:opacity-50" aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
