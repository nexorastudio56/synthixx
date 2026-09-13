"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/school/roles";
import { defaultLabels, type InstitutionLabels } from "@/lib/school/university";

export type InstitutionType =
  | "primary"
  | "secondary"
  | "school"
  | "college"
  | "university";

interface SchoolState {
  userId: string | null;
  email: string | null;
  schoolId: string | null;
  schoolName: string | null;
  logoUrl: string | null;
  letterhead: string | null;
  role: Role | null;
  studentId: string | null;
  institutionType: InstitutionType;
  terminology: Record<string, string>;
  loading: boolean;
}

interface SchoolCtx extends SchoolState {
  refresh: () => Promise<void>;
}

const Ctx = createContext<SchoolCtx | null>(null);

export function useSchool(): SchoolCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSchool must be used inside <SchoolProvider>");
  return ctx;
}

/** Institution-aware labels: "Semester"/"Dean" for higher ed, "Class"/"Principal" otherwise. */
export function useInstitutionLabels(): InstitutionLabels {
  const { institutionType, terminology } = useSchool();
  return defaultLabels(institutionType, terminology);
}

const EMPTY: SchoolState = {
  userId: null,
  email: null,
  schoolId: null,
  schoolName: null,
  logoUrl: null,
  letterhead: null,
  role: null,
  studentId: null,
  institutionType: "school",
  terminology: {},
  loading: true,
};

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SchoolState>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      // Resolve context server-side (reliable + redeems pending invites).
      const res = await fetch("/api/school/context", { cache: "no-store" });
      if (!res.ok) {
        setState({ ...EMPTY, loading: false });
        return;
      }
      const data = await res.json();
      setState({
        userId: data.userId ?? null,
        email: data.email ?? null,
        schoolId: data.schoolId ?? null,
        schoolName: data.schoolName ?? null,
        logoUrl: data.logoUrl ?? null,
        letterhead: data.letterhead ?? null,
        role: (data.role as Role) ?? null,
        studentId: data.studentId ?? null,
        institutionType: (data.institutionType as InstitutionType) ?? "school",
        terminology: (data.terminology as Record<string, string>) ?? {},
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>;
}
