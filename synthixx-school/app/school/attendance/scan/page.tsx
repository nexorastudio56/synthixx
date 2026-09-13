"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, ScanLine, StopCircle } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import type { Student } from "@/lib/school/types";
import { PageHeader, Input, useToast } from "@/components/school/ui";

interface Marked { id: string; name: string; at: string }

export default function ScanAttendancePage() {
  return (
    <ModuleGuard module="attendance">
      <ScanView />
    </ModuleGuard>
  );
}

function ScanView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [manual, setManual] = useState("");
  const [marked, setMarked] = useState<Marked[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const recentRef = useRef<Map<string, number>>(new Map());

  const markPresent = useCallback(async (rawId: string) => {
    if (!schoolId) return;
    const id = rawId.trim();
    if (!id) return;
    // Debounce duplicate scans within 5s.
    const now = Date.now();
    if ((recentRef.current.get(id) ?? 0) > now - 5000) return;
    recentRef.current.set(id, now);

    try {
      const { data: st } = await sb()
        .from("students")
        .select("id,name,class")
        .eq("school_id", schoolId)
        .eq("id", id)
        .maybeSingle();
      const student = st as Pick<Student, "id" | "name" | "class"> | null;
      if (!student) { show("Student not found", "error"); return; }

      const { error } = await sb().from("attendance").upsert(
        { school_id: schoolId, student_id: student.id, date: today, status: "present", class: student.class },
        { onConflict: "school_id,student_id,date" },
      );
      if (error) throw error;
      setMarked((cur) => [{ id: student.id, name: student.name, at: new Date().toLocaleTimeString() }, ...cur.filter((m) => m.id !== student.id)]);
      show(`${student.name} marked present`);
    } catch {
      show("Could not mark attendance", "error");
    }
  }, [schoolId, today, show]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) { setCameraSupported(false); show("QR camera scanning not supported on this browser — use manual entry", "error"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const detector = new BD({ formats: ["qr_code"] });
      const tick = async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) markPresent(codes[0].rawValue);
          } catch {}
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      show("Could not access camera", "error");
      setScanning(false);
    }
  }, [markPresent, show]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-5">
      <Link href="/school/attendance" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Attendance
      </Link>
      <PageHeader title="QR Attendance" description={`Scan student ID cards to mark present · ${today}`} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ScanLine className="h-4 w-4 text-accent" /> Camera scanner</h2>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black/80">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                Camera off
              </div>
            )}
          </div>
          <div className="mt-3">
            {scanning ? (
              <button onClick={stopCamera} className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
                <StopCircle className="h-4 w-4 text-danger" /> Stop
              </button>
            ) : (
              <button onClick={startCamera} disabled={!cameraSupported} className="sk-press inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
                <Camera className="h-4 w-4" /> Start camera
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">Manual entry</p>
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { markPresent(manual); setManual(""); } }}
                placeholder="Paste / type student ID"
              />
              <button onClick={() => { markPresent(manual); setManual(""); }} className="sk-press shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
                Mark
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Marked present today ({marked.length})</h2>
          {marked.length === 0 ? (
            <p className="text-sm text-muted">No one marked yet. Scan an ID card or enter a student ID.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {marked.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> {m.name}</span>
                  <span className="text-muted">{m.at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
