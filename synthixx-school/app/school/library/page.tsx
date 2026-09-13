"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, BookUp, Undo2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import type { Book, BookIssue, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Pill, AIInsightCard, useToast,
} from "@/components/school/ui";

const FINE_PER_DAY = 5;

export default function LibraryPage() {
  return (
    <ModuleGuard module="library">
      <LibraryView />
    </ModuleGuard>
  );
}

function LibraryView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [b, i, s] = await Promise.all([
        supabase.from("books").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("book_issues").select("*").eq("school_id", schoolId).order("issue_date", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setBooks((b.data ?? []) as Book[]);
      setIssues((i.data ?? []) as BookIssue[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load library", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const bookName = useMemo(() => new Map(books.map((b) => [b.id, b.title])), [books]);
  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = issues.filter((i) => !i.returned && i.return_date && i.return_date < today);

  const filteredBooks = books.filter((b) =>
    !query || `${b.title} ${b.author ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  async function returnBook(issue: BookIssue) {
    try {
      let fine = 0;
      if (issue.return_date && issue.return_date < today) {
        const days = Math.ceil((Date.parse(today) - Date.parse(issue.return_date)) / 86400000);
        fine = days * FINE_PER_DAY;
      }
      await updateRow("book_issues", issue.id, { returned: true, fine_amount: fine });
      const book = books.find((b) => b.id === issue.book_id);
      if (book) await updateRow("books", book.id, { available_copies: book.available_copies + 1 });
      setIssues((c) => c.map((i) => (i.id === issue.id ? { ...i, returned: true, fine_amount: fine } : i)));
      setBooks((c) => c.map((b) => (b.id === issue.book_id ? { ...b, available_copies: b.available_copies + 1 } : b)));
      show(fine > 0 ? `Returned · fine Rs. ${fine}` : "Returned");
    } catch { show("Return failed", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Library"
        description="Manage books, issues and returns."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setIssueOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"><BookUp className="h-4 w-4" /> Issue</button>
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Book</button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Titles" value={books.length} />
        <StatCard label="Copies" value={books.reduce((s, b) => s + b.total_copies, 0)} />
        <StatCard label="Issued" value={issues.filter((i) => !i.returned).length} />
        <StatCard label="Overdue" value={overdue.length} />
      </div>

      <div className="mb-4">
        <AIInsightCard
          title="Book suggestions"
          description="Ask AI to suggest books for a class/subject."
          buttonLabel="Suggest for Class 6 Science"
          onRun={() => getAIInsight("Suggest 6 age-appropriate books with author for the given class/subject. One per line.", "Suggest books for Class 6 Science.")}
        />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or author" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {loading ? <TableSkeleton cols={4} /> : filteredBooks.length === 0 ? (
        <EmptyState title="No books" description="Add books to your catalog." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Available</th></tr>
            </thead>
            <tbody>
              {filteredBooks.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3">{b.author || "—"}</td>
                  <td className="px-4 py-3">{b.category || "—"}</td>
                  <td className="px-4 py-3"><Pill tone={b.available_copies > 0 ? "green" : "red"}>{b.available_copies}/{b.total_copies}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold">Issued & overdue</h2>
      {issues.filter((i) => !i.returned).length === 0 ? (
        <p className="text-sm text-muted">Nothing issued.</p>
      ) : (
        <div className="space-y-1.5">
          {issues.filter((i) => !i.returned).map((i) => {
            const isOverdue = i.return_date && i.return_date < today;
            return (
              <div key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
                <span><span className="font-medium">{bookName.get(i.book_id ?? "") ?? "—"}</span> → {studentName.get(i.student_id ?? "") ?? "—"}</span>
                <span className="flex items-center gap-2">
                  {isOverdue && <Pill tone="red">Overdue</Pill>}
                  {i.return_date && <span className="text-xs text-muted">due {i.return_date}</span>}
                  <button onClick={() => returnBook(i)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft"><Undo2 className="h-3.5 w-3.5" /> Return</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <AddBookModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={(b) => { setBooks((c) => [b, ...c]); show("Book added"); }} />
      <IssueBookModal open={issueOpen} onClose={() => setIssueOpen(false)} books={books} students={students}
        onIssued={(issue, book) => { setIssues((c) => [issue, ...c]); setBooks((c) => c.map((b) => (b.id === book.id ? { ...b, available_copies: b.available_copies - 1 } : b))); show("Book issued"); }} />
    </div>
  );
}

function AddBookModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (b: Book) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ title: "", author: "", category: "", copies: "1" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.title.trim()) return;
    setBusy(true);
    try {
      const copies = Number(form.copies) || 1;
      const row = (await insertRow("books", schoolId, { title: form.title.trim(), author: form.author.trim() || null, category: form.category.trim() || null, total_copies: copies, available_copies: copies })) as Book;
      onAdded(row);
      setForm({ title: "", author: "", category: "", copies: "1" });
      onClose();
    } catch { show("Could not add book", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Book">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Author"><Input value={form.author} onChange={(e) => set("author", e.target.value)} /></Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
        </div>
        <Field label="Total copies"><Input type="number" value={form.copies} onChange={(e) => set("copies", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Book"}</button>
      </form>
    </Modal>
  );
}

function IssueBookModal({
  open, onClose, books, students, onIssued,
}: { open: boolean; onClose: () => void; books: Book[]; students: Student[]; onIssued: (i: BookIssue, b: Book) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [bookId, setBookId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !bookId || !studentId) return;
    const book = books.find((b) => b.id === bookId);
    if (!book || book.available_copies <= 0) { show("No copies available", "error"); return; }
    setBusy(true);
    try {
      const issue = (await insertRow("book_issues", schoolId, { book_id: bookId, student_id: studentId, issue_date: new Date().toISOString().slice(0, 10), return_date: due || null, returned: false, fine_amount: 0 })) as BookIssue;
      await updateRow("books", book.id, { available_copies: book.available_copies - 1 });
      onIssued(issue, book);
      setBookId(""); setStudentId(""); setDue("");
      onClose();
    } catch { show("Could not issue", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Issue Book">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Book">
          <select value={bookId} onChange={(e) => setBookId(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Select book</option>
            {books.filter((b) => b.available_copies > 0).map((b) => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} left)</option>)}
          </select>
        </Field>
        <Field label="Student">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </select>
        </Field>
        <Field label="Return by"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Issuing…" : "Issue Book"}</button>
      </form>
    </Modal>
  );
}
