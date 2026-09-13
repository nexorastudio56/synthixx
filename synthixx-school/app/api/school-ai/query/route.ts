import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { streamWithFallback, anyProviderConfigured } from "@/lib/ai";
import { SCHOOL_AI_SYSTEM } from "@/lib/school/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Live-data assistant for the School agent. Resolves the caller's school
 * server-side, builds a BOUNDED aggregate snapshot (so it scales to large
 * schools), and streams the answer as NDJSON.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (!anyProviderConfigured())
    return Response.json({ error: "Synthixx AI is not configured yet. Please try again later." }, { status: 503 });

  const svc = createServiceClient();
  const { data: member } = await svc
    .from("school_users")
    .select("school_id, role, schools(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!member) return Response.json({ error: "No school" }, { status: 403 });
  // Parents must not access the school-wide assistant (they only see their child).
  if (member.role === "PARENT") return Response.json({ error: "Not allowed" }, { status: 403 });

  const schoolId = member.school_id as string;
  const raw = member.schools as { name?: string } | { name?: string }[] | null;
  const schoolName = (Array.isArray(raw) ? raw[0]?.name : raw?.name) ?? "the school";

  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? "").slice(0, 4000);
  const history: { role: string; content: string }[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  if (!message.trim()) return Response.json({ error: "Empty request" }, { status: 400 });

  const snapshot = await buildSnapshot(svc, schoolId);

  const system = `${SCHOOL_AI_SYSTEM}

You are the live assistant for "${schoolName}", helping teachers, principals and admins. The JSON below is a complete snapshot of the school's current database (students, teachers, fees, attendance, exams, homework, events, timetable, announcements, and per-student details). Use it as your single source of truth.

Rules:
- Answer ANY question about the school using this data — about individual students, classes, fees, attendance, exam performance, teachers, schedule, homework or events.
- Compute counts, sums, averages, percentages and rankings yourself from the data.
- When asked about a specific student or class, give the full relevant detail you have (attendance %, fee dues, exam results/average, etc.).
- If the user asks for a list (e.g. defaulters, top students, absentees), produce it from the data.
- Only say data is unavailable if it genuinely is not present in the snapshot.
- Keep answers clear and well-structured (use short headings or bullet lists when helpful).

LIVE DATA (JSON):
${JSON.stringify(snapshot)}`;

  const convo = history.map((m) => `${m.role === "user" ? "User" : "SchoolAI"}: ${m.content}`).join("\n");
  const userMessage = convo ? `${convo}\nUser: ${message}` : message;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for await (const ev of streamWithFallback({
          tier: "pro",
          opts: { system, messages: [{ role: "user", parts: [{ type: "text", text: userMessage }] }], maxTokens: 4096 },
        })) {
          if (ev.type === "text") send({ type: "text", text: ev.text });
          else if (ev.type === "error") send({ type: "error", message: "SchoolAI couldn't respond right now." });
        }
      } catch {
        send({ type: "error", message: "SchoolAI couldn't respond right now." });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}

type Svc = ReturnType<typeof createServiceClient>;

async function buildSnapshot(svc: Svc, schoolId: string) {
  const [students, teachers, fees, attendance, exams, assignments, events, timetable, announcements] = await Promise.all([
    svc.from("students").select("id,name,class,roll_no,status,parent_name,parent_phone").eq("school_id", schoolId),
    svc.from("teachers").select("id,name,subject,phone").eq("school_id", schoolId),
    svc.from("fees").select("student_id,amount,status,month").eq("school_id", schoolId),
    svc.from("attendance").select("student_id,status,class,date").eq("school_id", schoolId).order("date", { ascending: false }).limit(6000),
    svc.from("exams").select("student_id,subject,marks,total_marks,exam_date").eq("school_id", schoolId).limit(6000),
    svc.from("assignments").select("title,subject,class,due_date").eq("school_id", schoolId).order("due_date", { ascending: false }).limit(40),
    svc.from("events").select("title,description,date,type,status").eq("school_id", schoolId).order("date", { ascending: false }).limit(30),
    svc.from("timetable").select("class_name,day,period,subject,teacher_id,room").eq("school_id", schoolId).limit(500),
    svc.from("announcements").select("title,body,created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(15),
  ]);

  const sRows = (students.data ?? []) as { id: string; name: string; class: string | null; roll_no: string | null; status: string; parent_name: string | null; parent_phone: string | null }[];
  const tRows = (teachers.data ?? []) as { id: string; name: string; subject: string | null; phone: string | null }[];
  const fRows = (fees.data ?? []) as { student_id: string | null; amount: number; status: string; month: string | null }[];
  const aRows = (attendance.data ?? []) as { student_id: string | null; status: string; class: string | null }[];
  const eRows = (exams.data ?? []) as { student_id: string | null; subject: string | null; marks: number; total_marks: number }[];

  const nameOf = new Map(sRows.map((s) => [s.id, s.name]));
  const classOf = new Map(sRows.map((s) => [s.id, s.class || "—"]));
  const teacherName = new Map(tRows.map((t) => [t.id, t.name]));

  const byClass: Record<string, number> = {};
  for (const s of sRows) byClass[s.class || "—"] = (byClass[s.class || "—"] || 0) + 1;

  const collected = fRows.filter((f) => f.status === "paid").reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const pending = fRows.filter((f) => f.status !== "paid").reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const dueByStudent = new Map<string, number>();
  for (const f of fRows.filter((x) => x.status !== "paid")) {
    if (!f.student_id) continue;
    dueByStudent.set(f.student_id, (dueByStudent.get(f.student_id) ?? 0) + (Number(f.amount) || 0));
  }
  const topDefaulters = [...dueByStudent.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([id, due]) => ({ student: nameOf.get(id) ?? "—", class: classOf.get(id) ?? "—", due }));

  const attByStudent = new Map<string, { p: number; t: number }>();
  for (const a of aRows) {
    if (!a.student_id) continue;
    const g = attByStudent.get(a.student_id) ?? { p: 0, t: 0 };
    g.t += 1; if (a.status === "present") g.p += 1;
    attByStudent.set(a.student_id, g);
  }
  const attPctOf = (id: string): number | null => {
    const g = attByStudent.get(id);
    return g && g.t ? Math.round((g.p / g.t) * 100) : null;
  };
  const lowAttendance = [...attByStudent.entries()]
    .map(([id, g]) => ({ student: nameOf.get(id) ?? "—", class: classOf.get(id) ?? "—", pct: Math.round((g.p / g.t) * 100) }))
    .filter((x) => x.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 25);

  // Per-student exam aggregates.
  const examByStudent = new Map<string, { sum: number; n: number }>();
  const subjectAgg: Record<string, { sum: number; n: number }> = {};
  for (const e of eRows) {
    const pct = (Number(e.total_marks) || 0) ? ((Number(e.marks) || 0) / Number(e.total_marks)) * 100 : 0;
    if (e.student_id) {
      const g = examByStudent.get(e.student_id) ?? { sum: 0, n: 0 };
      g.sum += pct; g.n += 1; examByStudent.set(e.student_id, g);
    }
    const subj = e.subject || "—";
    const sg = subjectAgg[subj] ?? { sum: 0, n: 0 };
    sg.sum += pct; sg.n += 1; subjectAgg[subj] = sg;
  }
  const avgPctOf = (id: string): number | null => {
    const g = examByStudent.get(id);
    return g && g.n ? Math.round(g.sum / g.n) : null;
  };

  const classAvg: Record<string, { sum: number; n: number }> = {};
  for (const e of eRows) {
    const c = classOf.get(e.student_id ?? "") ?? "—";
    const pct = (Number(e.total_marks) || 0) ? ((Number(e.marks) || 0) / Number(e.total_marks)) * 100 : 0;
    const g = classAvg[c] ?? { sum: 0, n: 0 };
    g.sum += pct; g.n += 1; classAvg[c] = g;
  }
  const classPerformance = Object.entries(classAvg).map(([c, g]) => ({ class: c, avgPct: Math.round(g.sum / g.n) }));
  const subjectPerformance = Object.entries(subjectAgg).map(([s, g]) => ({ subject: s, avgPct: Math.round(g.sum / g.n) })).sort((a, b) => b.avgPct - a.avgPct);

  // Full per-student roster with computed metrics (bounded for very large schools).
  const roster = sRows.slice(0, 500).map((s) => ({
    name: s.name,
    class: s.class || "—",
    roll_no: s.roll_no,
    status: s.status,
    parent: s.parent_name,
    parent_phone: s.parent_phone,
    attendancePct: attPctOf(s.id),
    examAvgPct: avgPctOf(s.id),
    feeDue: dueByStudent.get(s.id) ?? 0,
  }));

  const topStudents = roster
    .filter((r) => r.examAvgPct !== null)
    .sort((a, b) => (b.examAvgPct ?? 0) - (a.examAvgPct ?? 0))
    .slice(0, 15)
    .map((r) => ({ student: r.name, class: r.class, avgPct: r.examAvgPct }));

  return {
    counts: {
      students: sRows.length,
      activeStudents: sRows.filter((s) => s.status === "active").length,
      teachers: tRows.length,
      truncatedRoster: sRows.length > 500,
    },
    classStrength: byClass,
    fees: { collected, pending, records: fRows.length, byStatus: countBy(fRows, "status") },
    topFeeDefaulters: topDefaulters,
    attendance: { recordsAnalyzed: aRows.length, lowAttendanceStudents: lowAttendance },
    classPerformance,
    subjectPerformance,
    topStudents,
    teachers: tRows.slice(0, 100),
    students: roster,
    recentAssignments: assignments.data ?? [],
    events: events.data ?? [],
    announcements: announcements.data ?? [],
    timetable: ((timetable.data ?? []) as { class_name: string; day: string; period: number; subject: string | null; teacher_id: string | null; room: string | null }[])
      .map((r) => ({ class: r.class_name, day: r.day, period: r.period, subject: r.subject, teacher: r.teacher_id ? teacherName.get(r.teacher_id) ?? null : null, room: r.room })),
  };
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  const out: Record<string, number> = {};
  for (const r of rows) { const k = String(r[key]); out[k] = (out[k] || 0) + 1; }
  return out;
}
