"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ArrowUpRight, Trophy } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow, updateRow } from "@/lib/school/queries";
import type { SchoolClass, Section, Subject, Student, Exam } from "@/lib/school/types";
import {
  PageHeader, StatCard, EmptyState, Modal, Field, Input, Select, Pill, Spinner, useToast,
} from "@/components/school/ui";

export default function AcademicsPage() {
  return (
    <ModuleGuard module="academics">
      <AcademicsView />
    </ModuleGuard>
  );
}

function AcademicsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [modal, setModal] = useState<null | "class" | "section" | "subject" | "promote">(null);
  const [rankClass, setRankClass] = useState("");

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [c, se, su, st, ex] = await Promise.all([
        supabase.from("classes").select("*").eq("school_id", schoolId).order("order_index"),
        supabase.from("sections").select("*").eq("school_id", schoolId).order("class_name"),
        supabase.from("subjects").select("*").eq("school_id", schoolId).order("name"),
        supabase.from("students").select("*").eq("school_id", schoolId),
        supabase.from("exams").select("*").eq("school_id", schoolId),
      ]);
      setClasses((c.data ?? []) as SchoolClass[]);
      setSections((se.data ?? []) as Section[]);
      setSubjects((su.data ?? []) as Subject[]);
      setStudents((st.data ?? []) as Student[]);
      setExams((ex.data ?? []) as Exam[]);
    } catch {
      show("Could not load academics", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  // Distinct class labels = managed classes ∪ classes seen on students.
  const classNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.name));
    students.forEach((s) => s.class && set.add(s.class));
    return [...set];
  }, [classes, students]);

  const ranks = useMemo(() => {
    if (!rankClass) return [];
    const inClass = students.filter((s) => s.class === rankClass && s.status === "active");
    const rows = inClass.map((s) => {
      const ex = exams.filter((e) => e.student_id === s.id);
      const marks = ex.reduce((a, e) => a + (Number(e.marks) || 0), 0);
      const max = ex.reduce((a, e) => a + (Number(e.total_marks) || 0), 0);
      return { id: s.id, name: s.name, pct: max ? Math.round((marks / max) * 100) : 0, has: ex.length > 0 };
    });
    return rows.sort((a, b) => b.pct - a.pct);
  }, [rankClass, students, exams]);

  async function remove(table: string, id: string) {
    if (!confirm("Delete this?")) return;
    try { await deleteRow(table, id); load(); } catch { show("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Academics"
        description="Manage classes, sections and subjects, see class ranks, and promote students."
        actions={
          <button onClick={() => setModal("promote")} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <ArrowUpRight className="h-4 w-4" /> Promote Students
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Classes" value={classes.length} />
        <StatCard label="Sections" value={sections.length} />
        <StatCard label="Subjects" value={subjects.length} />
        <StatCard label="Students" value={students.length} />
      </div>

      {loading ? <div className="flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> Loading…</div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Classes" onAdd={() => setModal("class")}>
            {classes.length === 0 ? <EmptyState title="No classes" description="Add classes to enable promotion order." /> : (
              <ul className="space-y-1.5 text-sm">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span>{c.name} <span className="text-xs text-muted">#{c.order_index}</span></span>
                    <button onClick={() => remove("classes", c.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Sections" onAdd={() => setModal("section")}>
            {sections.length === 0 ? <EmptyState title="No sections" description="Add sections like A, B, C." /> : (
              <ul className="space-y-1.5 text-sm">
                {sections.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span>Class {s.class_name} · Section {s.name}</span>
                    <button onClick={() => remove("sections", s.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Subjects" onAdd={() => setModal("subject")}>
            {subjects.length === 0 ? <EmptyState title="No subjects" description="Add subjects offered." /> : (
              <ul className="space-y-1.5 text-sm">
                {subjects.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span>{s.name}{s.class_name ? ` · Class ${s.class_name}` : ""}</span>
                    <button onClick={() => remove("subjects", s.id)} className="text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Trophy className="h-4 w-4 text-accent" /> Class Rank</h3>
              <Select value={rankClass} onChange={(e) => setRankClass(e.target.value)} className="h-8 w-36 py-0 text-xs">
                <option value="">Select class</option>
                {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            {!rankClass ? <p className="text-sm text-muted">Pick a class to see ranking by overall result.</p> : ranks.length === 0 ? (
              <p className="text-sm text-muted">No active students in this class.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {ranks.map((r, i) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <span className="flex items-center gap-2"><span className="w-5 text-muted">{i + 1}.</span>{r.name}</span>
                    {r.has ? <Pill tone={r.pct >= 50 ? "green" : "red"}>{r.pct}%</Pill> : <span className="text-xs text-muted">no results</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {modal === "class" && <ClassModal classes={classes} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "section" && <SectionModal classNames={classNames} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "subject" && <SubjectModal classNames={classNames} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === "promote" && <PromoteModal classes={classes} classNames={classNames} students={students} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function Card({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      {children}
    </div>
  );
}

function ClassModal({ classes, onClose, onDone }: { classes: SchoolClass[]; onClose: () => void; onDone: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [order, setOrder] = useState(String(classes.length + 1));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try { await insertRow("classes", schoolId, { name: name.trim(), order_index: Number(order) || 0 }); onDone(); }
    catch { show("Could not add class (duplicate name?)", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Add Class">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Class name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 6" required /></Field>
        <Field label="Order (for promotion)"><Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Class"}</button>
      </form>
    </Modal>
  );
}

function SectionModal({ classNames, onClose, onDone }: { classNames: string[]; onClose: () => void; onDone: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [className, setClassName] = useState(classNames[0] ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !className.trim() || !name.trim()) return;
    setBusy(true);
    try { await insertRow("sections", schoolId, { class_name: className.trim(), name: name.trim() }); onDone(); }
    catch { show("Could not add section", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Add Section">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Class">
          <Select value={className} onChange={(e) => setClassName(e.target.value)}>
            {classNames.length === 0 && <option value="">No classes yet</option>}
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Section name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A" required /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Section"}</button>
      </form>
    </Modal>
  );
}

function SubjectModal({ classNames, onClose, onDone }: { classNames: string[]; onClose: () => void; onDone: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try { await insertRow("subjects", schoolId, { name: name.trim(), class_name: className.trim() || null }); onDone(); }
    catch { show("Could not add subject", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Add Subject">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Subject name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" required /></Field>
        <Field label="Class (optional)">
          <Select value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">All classes</option>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Subject"}</button>
      </form>
    </Modal>
  );
}

function PromoteModal({
  classes, classNames, students, onClose, onDone,
}: { classes: SchoolClass[]; classNames: string[]; students: Student[]; onClose: () => void; onDone: () => void }) {
  const { show } = useToast();
  const ordered = [...classes].sort((a, b) => a.order_index - b.order_index);
  const [from, setFrom] = useState(ordered[0]?.name ?? classNames[0] ?? "");
  const [to, setTo] = useState("");
  const [graduate, setGraduate] = useState(false);
  const [busy, setBusy] = useState(false);

  // Suggest next class by order.
  useEffect(() => {
    const idx = ordered.findIndex((c) => c.name === from);
    if (idx >= 0 && idx + 1 < ordered.length) setTo(ordered[idx + 1].name);
    else setTo("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  const affected = students.filter((s) => s.class === from && s.status === "active");

  async function promote() {
    if (!from || (!graduate && !to.trim())) { show("Pick a target class", "info"); return; }
    if (!confirm(`Promote ${affected.length} student(s) from ${from} ${graduate ? "to alumni (graduate)" : `to ${to}`}?`)) return;
    setBusy(true);
    try {
      await Promise.all(affected.map((s) =>
        graduate
          ? updateRow("students", s.id, { status: "alumni" })
          : updateRow("students", s.id, { class: to.trim() }),
      ));
      show(`Promoted ${affected.length} student(s)`);
      onDone();
    } catch {
      show("Promotion failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Promote Students">
      <div className="space-y-3">
        <Field label="From class">
          <Select value={from} onChange={(e) => setFrom(e.target.value)}>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={graduate} onChange={(e) => setGraduate(e.target.checked)} />
          Graduate (move to Alumni instead of next class)
        </label>
        {!graduate && (
          <Field label="To class"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. 7" /></Field>
        )}
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
          {affected.length} active student(s) in class {from || "—"} will be {graduate ? "graduated to alumni" : `moved to ${to || "…"}`}.
        </p>
        <button onClick={promote} disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Promoting…" : "Promote"}
        </button>
      </div>
    </Modal>
  );
}
