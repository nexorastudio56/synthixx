"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trophy, Megaphone, Download, Award, Trash2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import { downloadSchoolBackup } from "@/lib/school/export";
import { Avatar } from "@/components/school/avatar-upload";
import type { Announcement, AnnouncementReaction, StudentPoints, Student } from "@/lib/school/types";
import {
  PageHeader, EmptyState, Modal, Field, Input, Select, Textarea, useToast, Spinner,
} from "@/components/school/ui";

const EMOJIS = ["👍", "❤️", "🎉", "👏"];

export default function EngagementPage() {
  return (
    <ModuleGuard module="engagement">
      <EngagementView />
    </ModuleGuard>
  );
}

function EngagementView() {
  const { schoolId, schoolName, userId, role } = useSchool();
  const { show } = useToast();
  const isAdmin = role === "SCHOOL_ADMIN" || role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reactions, setReactions] = useState<AnnouncementReaction[]>([]);
  const [points, setPoints] = useState<StudentPoints[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [annOpen, setAnnOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [a, r, p, s] = await Promise.all([
        supabase.from("announcements").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("announcement_reactions").select("*").eq("school_id", schoolId),
        supabase.from("student_points").select("*").eq("school_id", schoolId),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setAnnouncements((a.data ?? []) as Announcement[]);
      setReactions((r.data ?? []) as AnnouncementReaction[]);
      setPoints((p.data ?? []) as StudentPoints[]);
      setStudents((s.data ?? []) as Student[]);
    } catch {
      show("Could not load engagement data", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const leaderboard = useMemo(() => {
    const totals = new Map<string, { points: number; badges: string[] }>();
    points.forEach((p) => {
      const cur = totals.get(p.student_id) ?? { points: 0, badges: [] };
      cur.points += p.points;
      if (p.badge) cur.badges.push(p.badge);
      totals.set(p.student_id, cur);
    });
    return [...totals.entries()]
      .map(([id, v]) => ({ student: students.find((s) => s.id === id), ...v }))
      .filter((x) => x.student)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }, [points, students]);

  async function toggleReaction(annId: string, emoji: string) {
    if (!schoolId || !userId) return;
    const existing = reactions.find((r) => r.announcement_id === annId && r.user_id === userId && r.emoji === emoji);
    try {
      if (existing) {
        await deleteRow("announcement_reactions", existing.id);
        setReactions((c) => c.filter((r) => r.id !== existing.id));
      } else {
        const row = (await insertRow("announcement_reactions", schoolId, { announcement_id: annId, user_id: userId, emoji })) as AnnouncementReaction;
        setReactions((c) => [...c, row]);
      }
    } catch {
      show("Could not react", "error");
    }
  }

  async function removeAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteRow("announcements", id);
      setAnnouncements((c) => c.filter((a) => a.id !== id));
    } catch {
      show("Delete failed", "error");
    }
  }

  async function doExport() {
    if (!schoolId) return;
    setExporting(true);
    try {
      await downloadSchoolBackup(schoolId, schoolName);
      show("Backup downloaded");
    } catch {
      show("Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Engagement"
        description="Announcements, student leaderboard and data backup."
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <button onClick={doExport} disabled={exporting} className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50">
                {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Export ZIP
              </button>
            )}
            <button onClick={() => setAwardOpen(true)} className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <Award className="h-4 w-4 text-accent" /> Award points
            </button>
            <button onClick={() => setAnnOpen(true)} className="sk-press inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              <Plus className="h-4 w-4" /> Announcement
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-accent" /> Announcements</h2>
            {announcements.length === 0 ? (
              <EmptyState title="No announcements" description="Post the first announcement for your school." />
            ) : (
              <div className="sk-stagger space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="sk-card rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{a.title}</h3>
                        {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{a.body}</p>}
                        <p className="mt-1 text-xs text-muted">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => removeAnnouncement(a.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {EMOJIS.map((emoji) => {
                        const count = reactions.filter((r) => r.announcement_id === a.id && r.emoji === emoji).length;
                        const mine = reactions.some((r) => r.announcement_id === a.id && r.emoji === emoji && r.user_id === userId);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(a.id, emoji)}
                            className={`sk-press rounded-full border px-2.5 py-1 text-xs transition-colors ${mine ? "border-accent bg-accent-soft" : "border-border hover:bg-accent-soft"}`}
                          >
                            {emoji} {count > 0 && <span className="text-muted">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-accent" /> Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <EmptyState title="No points yet" description="Award points to students to build the leaderboard." />
            ) : (
              <ul className="sk-stagger space-y-2">
                {leaderboard.map((row, i) => (
                  <li key={row.student!.id} className="sk-card flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${i === 0 ? "bg-amber-400/30 text-amber-600 dark:text-amber-400" : i === 1 ? "bg-gray-300/40 text-gray-600 dark:text-gray-300" : i === 2 ? "bg-orange-400/30 text-orange-600 dark:text-orange-400" : "bg-accent-soft text-muted"}`}>
                      {i + 1}
                    </span>
                    <Avatar name={row.student!.name} url={row.student!.photo_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.student!.name}</p>
                      {row.badges.length > 0 && <p className="truncate text-xs text-muted">{[...new Set(row.badges)].join(" · ")}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-accent">{row.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AnnouncementModal
        open={annOpen}
        onClose={() => setAnnOpen(false)}
        onAdded={(a) => { setAnnouncements((c) => [a, ...c]); show("Announcement posted"); }}
      />
      <AwardModal
        open={awardOpen}
        onClose={() => setAwardOpen(false)}
        students={students}
        onAwarded={(p) => { setPoints((c) => [...c, p]); show("Points awarded"); }}
      />
    </div>
  );
}

function AnnouncementModal({
  open, onClose, onAdded,
}: { open: boolean; onClose: () => void; onAdded: (a: Announcement) => void }) {
  const { schoolId, userId } = useSchool();
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !title.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("announcements", schoolId, { title: title.trim(), body: body.trim() || null, created_by: userId })) as Announcement;
      onAdded(row);
      setTitle(""); setBody("");
      onClose();
    } catch {
      show("Could not post", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Announcement">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Sports Day on Friday" /></Field>
        <Field label="Details"><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="sk-press w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Posting…" : "Post"}
        </button>
      </form>
    </Modal>
  );
}

function AwardModal({
  open, onClose, students, onAwarded,
}: { open: boolean; onClose: () => void; students: Student[]; onAwarded: (p: StudentPoints) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [studentId, setStudentId] = useState("");
  const [pts, setPts] = useState("10");
  const [reason, setReason] = useState("");
  const [badge, setBadge] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !studentId) return;
    setBusy(true);
    try {
      const row = (await insertRow("student_points", schoolId, {
        student_id: studentId,
        points: Number(pts) || 0,
        reason: reason.trim() || null,
        badge: badge.trim() || null,
      })) as StudentPoints;
      onAwarded(row);
      setStudentId(""); setPts("10"); setReason(""); setBadge("");
      onClose();
    } catch {
      show("Could not award points", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Award Points">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Select student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Points"><Input type="number" value={pts} onChange={(e) => setPts(e.target.value)} /></Field>
          <Field label="Badge (optional)"><Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Star Performer" /></Field>
        </div>
        <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Top in Math test" /></Field>
        <button type="submit" disabled={busy} className="sk-press w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : "Award"}
        </button>
      </form>
    </Modal>
  );
}
