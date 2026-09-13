"use client";

import JSZip from "jszip";
import { sb } from "./client";
import { toCSV } from "./csv";

const EXPORT_TABLES: { table: string; columns: string[] }[] = [
  { table: "students", columns: ["id", "name", "class", "roll_no", "parent_name", "parent_phone", "status", "created_at"] },
  { table: "teachers", columns: ["id", "name", "subject", "phone", "salary", "created_at"] },
  { table: "fees", columns: ["id", "student_id", "month", "amount", "status", "paid_date", "created_at"] },
  { table: "attendance", columns: ["id", "student_id", "date", "status", "class", "created_at"] },
  { table: "exams", columns: ["id", "student_id", "subject", "marks", "total_marks", "exam_date", "created_at"] },
  { table: "admission_leads", columns: ["id", "name", "parent_name", "phone", "email", "class_applied", "status", "created_at"] },
  { table: "timetable", columns: ["id", "class_name", "day", "period", "subject", "teacher_id", "room"] },
];

/**
 * Download a ZIP of all the school's core data as CSV files. RLS limits the
 * rows returned to the caller's school, so this is safe per-tenant.
 */
export async function downloadSchoolBackup(schoolId: string, schoolName?: string | null): Promise<void> {
  const zip = new JSZip();
  const supabase = sb();

  for (const { table, columns } of EXPORT_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*").eq("school_id", schoolId);
      if (error) continue;
      const rows = (data ?? []) as Record<string, unknown>[];
      zip.file(`${table}.csv`, toCSV(rows, columns));
    } catch {
      /* skip tables that don't exist yet */
    }
  }

  zip.file(
    "README.txt",
    `Data export for ${schoolName || "school"}\nGenerated: ${new Date().toISOString()}\nEach CSV contains one table. Re-import via the relevant module.`,
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = (schoolName || "school").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  a.download = `${safe}-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
