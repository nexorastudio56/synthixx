import type { GradeBand } from "./types";

export const DEFAULT_GRADES: GradeBand[] = [
  { grade: "A+", min: 90 }, { grade: "A", min: 80 }, { grade: "B", min: 70 },
  { grade: "C", min: 60 }, { grade: "D", min: 50 }, { grade: "F", min: 0 },
];

/** Map a percentage to a grade using the (descending) band list. */
export function gradeFor(pct: number, bands?: GradeBand[] | null): string {
  const list = (bands && bands.length ? bands : DEFAULT_GRADES)
    .slice()
    .sort((a, b) => b.min - a.min);
  for (const b of list) if (pct >= b.min) return b.grade;
  return list[list.length - 1]?.grade ?? "—";
}
