"use client";

import type { ReactNode } from "react";
import { useSchool } from "./school-provider";
import { AccessRestricted } from "./ui";
import { canAccess, type ModuleKey } from "@/lib/school/roles";

/** Wrap a module page; renders Access Restricted if the role lacks permission. */
export function ModuleGuard({
  module,
  children,
}: {
  module: ModuleKey;
  children: ReactNode;
}) {
  const { role, loading } = useSchool();
  if (loading) return null;
  if (!canAccess(role, module)) return <AccessRestricted />;
  return <>{children}</>;
}
