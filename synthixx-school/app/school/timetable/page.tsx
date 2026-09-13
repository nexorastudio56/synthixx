"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Sparkles, Trash2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { getAIInsight } from "@/lib/school/ai";
import { printHTML, escapeHTML } from "@/components/school/print";
import type { TimetableEntry, Teacher, SchoolClass, Subject } from "@/lib/school/types";
import {
  PageHeader, TableSkeleton, EmptyState, Modal, Field, Input, Select, useToast,
} from "@/components/school/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetablePage() {
  return (
    <ModuleGuard module="timetable">
      <TimetableView />
    </ModuleGuard>
  );
}

function TimetableView() {
  const { schoolId, schoolName, logoUrl, letterhead, role } = useSchool();
  const { show } = useToast();
  const canEdit = role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN";
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [cell, setCell] = useState<{ day: string; period: number } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [t, te, cl, su, st] = await Promise.all([
        supabase.from("timetable").select("*").eq("school_id", schoolId),
        supabase.from("teachers").select("*").eq("school_id", schoolId),
        supabase.from("classes").select("*").eq("school_id", schoolId).order("order_index"),
        supabase.from("subjects").select("*").eq("school_id", schoolId),
        supabase.from("students").select("class").eq("school_id", schoolId),
      ]);
      setEntries((t.data ?? []) as TimetableEntry[]);
      setTeachers((te.data ?? []) as Teacher[]);
      setSubjects((su.data ?? []) as Subject[]);
      const fromClasses = ((cl.data ?? []) as SchoolClass[]).map((c) => c.name);
      const fromStudents = [...new Set(((st.data ?? []) as { class: string | null }[]).map((s) => s.class).filter(Boolean))] as string[];
      const merged = [...new Set([...fromClasses, ...fromStudents])];
      setClasses(merged);
      setClassFilter((cur) => cur || merged[0] || "");
    } catch {
      show("Could not load timetable", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const grid = useMemo(() => {
    const m = new Map<string, TimetableEntry>();
    entries.filter((e) => e.class_name === classFilter).forEach((e) => m.set(`${e.day}-${e.period}`, e));
    return m;
  }, [entries, classFilter]);

  const teacherName = useCallback(
    (id: string | null) => teachers.find((t) => t.id === id)?.name ?? null,
    [teachers],
  );

  async function saveCell(values: { subject: string; teacher_id: string | null; room: string }) {
    if (!schoolId || !cell || !classFilter) return;
    try {
      const payload = {
        school_id: schoolId,
        class_name: classFilter,
        day: cell.day,
        period: cell.period,
        subject: values.subject || null,
        teacher_id: values.teacher_id,
        room: values.room || null,
      };
      const { data, error } = await sb()
        .from("timetable")
        .upsert(payload as never, { onConflict: "school_id,class_name,day,period" })
        .select()
        .single();
      if (error) throw error;
      const saved = data as TimetableEntry;
      setEntries((cur) => {
        const rest = cur.filter((e) => !(e.class_name === classFilter && e.day === cell.day && e.period === cell.period));
        return [...rest, saved];
      });
      show("Saved");
      setCell(null);
    } catch {
      show("Could not save", "error");
    }
  }

  async function clearCell(day: string, period: number) {
    const existing = grid.get(`${day}-${period}`);
    if (!existing) { setCell(null); return; }
    try {
      await sb().from("timetable").delete().eq("id", existing.id);
      setEntries((cur) => cur.filter((e) => e.id !== existing.id));
      show("Cleared");
      setCell(null);
    } catch {
      show("Could not clear", "error");
    }
  }

  async function autoGenerate() {
    if (!classFilter) { show("Pick a class first", "error"); return; }
    const subj = subjects.filter((s) => !s.class_name || s.class_name === classFilter).map((s) => s.name);
    const subjList = subj.length ? subj.join(", ") : "(no subjects configured — propose typical ones)";
    setAiBusy(true);
    try {
      const text = await getAIInsight(
        "You are a school timetable planner. Output ONLY a JSON array, no prose. Each item: {\"day\":\"Mon\",\"period\":1,\"subject\":\"Math\"}. Days Mon-Sat, periods 1-8. Avoid repeating the same subject twice in a day where possible. Distribute subjects evenly.",
        `Class: ${classFilter}\nSubjects available: ${subjList}\nTeachers: ${teachers.map((t) => `${t.name}${t.subject ? ` (${t.subject})` : ""}`).join(", ") || "n/a"}\nGenerate a balanced weekly timetable.`,
      );
      const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
      const parsed = JSON.parse(json) as { day: string; period: number; subject: string }[];
      if (!schoolId) return;
      const rows = parsed
        .filter((r) => DAYS.includes(r.day) && r.period >= 1 && r.period <= 8)
        .map((r) => ({ school_id: schoolId, class_name: classFilter, day: r.day, period: r.period, subject: r.subject }));
      if (rows.length === 0) throw new Error("empty");
      const { data, error } = await sb()
        .from("timetable")
        .upsert(rows as never, { onConflict: "school_id,class_name,day,period" })
        .select();
      if (error) throw error;
      const saved = (data ?? []) as TimetableEntry[];
      setEntries((cur) => {
        const rest = cur.filter((e) => e.class_name !== classFilter);
        return [...rest, ...saved];
      });
      show(`AI drafted ${saved.length} periods`);
    } catch {
      show("AI could not generate a timetable", "error");
    } finally {
      setAiBusy(false);
    }
  }

  function print() {
    const rows = PERIODS.map((p) => {
      const cells = DAYS.map((d) => {
        const e = grid.get(`${d}-${p}`);
        if (!e) return "<td></td>";
        return `<td><strong>${escapeHTML(e.subject ?? "")}</strong>${e.teacher_id ? `<br/><span class="muted">${escapeHTML(teacherName(e.teacher_id) ?? "")}</span>` : ""}${e.room ? `<br/><span class="muted">${escapeHTML(e.room)}</span>` : ""}</td>`;
      }).join("");
      return `<tr><th>P${p}</th>${cells}</tr>`;
    }).join("");
    const html = `<table class="kv"><thead><tr><th>Period</th>${DAYS.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
    printHTML({ schoolName, logoUrl, letterhead, title: `Timetable — Class ${classFilter}`, html });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        description="Weekly class schedule"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                onClick={autoGenerate}
                disabled={aiBusy}
                className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 text-accent" /> {aiBusy ? "Generating…" : "AI Auto-generate"}
              </button>
            )}
            <button
              onClick={print}
              className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        }
      />

      <div className="max-w-xs">
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          {classes.length === 0 && <option value="">No classes yet</option>}
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : classes.length === 0 ? (
        <EmptyState title="No classes found" description="Add classes under Academics or add students with classes first." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-accent-soft/50">
                <th className="p-2 text-left font-medium">Period</th>
                {DAYS.map((d) => <th key={d} className="p-2 text-left font-medium">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p} className="border-b border-border last:border-0">
                  <td className="p-2 font-medium text-muted">P{p}</td>
                  {DAYS.map((d) => {
                    const e = grid.get(`${d}-${p}`);
                    return (
                      <td key={d} className="p-1.5 align-top">
                        <button
                          onClick={() => canEdit && setCell({ day: d, period: p })}
                          disabled={!canEdit}
                          className={`sk-card h-full min-h-[52px] w-full rounded-lg border p-2 text-left text-xs ${
                            e ? "border-border bg-surface" : "border-dashed border-border/60 text-muted"
                          } ${canEdit ? "hover:border-accent" : "cursor-default"}`}
                        >
                          {e ? (
                            <>
                              <div className="font-medium text-foreground">{e.subject || "—"}</div>
                              {e.teacher_id && <div className="text-muted">{teacherName(e.teacher_id)}</div>}
                              {e.room && <div className="text-muted">{e.room}</div>}
                            </>
                          ) : (
                            canEdit ? "+ Add" : "—"
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cell && (
        <CellModal
          open={!!cell}
          onClose={() => setCell(null)}
          day={cell.day}
          period={cell.period}
          existing={grid.get(`${cell.day}-${cell.period}`) ?? null}
          teachers={teachers}
          subjects={subjects.filter((s) => !s.class_name || s.class_name === classFilter)}
          onSave={saveCell}
          onClear={() => clearCell(cell.day, cell.period)}
        />
      )}
    </div>
  );
}

function CellModal({
  open, onClose, day, period, existing, teachers, subjects, onSave, onClear,
}: {
  open: boolean;
  onClose: () => void;
  day: string;
  period: number;
  existing: TimetableEntry | null;
  teachers: Teacher[];
  subjects: Subject[];
  onSave: (v: { subject: string; teacher_id: string | null; room: string }) => void;
  onClear: () => void;
}) {
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [teacherId, setTeacherId] = useState(existing?.teacher_id ?? "");
  const [room, setRoom] = useState(existing?.room ?? "");

  return (
    <Modal open={open} onClose={onClose} title={`${day} · Period ${period}`}>
      <div className="space-y-3">
        <Field label="Subject">
          <Input list="tt-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
          <datalist id="tt-subjects">
            {subjects.map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
        </Field>
        <Field label="Teacher">
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">— None —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Room (optional)">
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 101" />
        </Field>
        <div className="flex items-center justify-between pt-1">
          {existing ? (
            <button onClick={onClear} className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          ) : <span />}
          <button
            onClick={() => onSave({ subject, teacher_id: teacherId || null, room })}
            className="sk-press rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
