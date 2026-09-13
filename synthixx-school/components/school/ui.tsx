"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { X, Sparkles, Inbox, ShieldAlert, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/school/motion";

/* ----------------------------------------------------------------------- */
/* Toast                                                                    */
/* ----------------------------------------------------------------------- */

type ToastKind = "success" | "error" | "info";
interface ToastMsg { id: number; text: string; kind: ToastKind }
interface ToastCtx { show: (text: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const show = useCallback((text: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, text, kind }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "sk-animate-slide-up pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg",
              t.kind === "success" && "bg-foreground text-background",
              t.kind === "error" && "bg-danger text-white",
              t.kind === "info" && "bg-accent text-accent-fg",
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {t.kind === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            {t.kind === "info" && <Info className="h-4 w-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ----------------------------------------------------------------------- */
/* Page header                                                              */
/* ----------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Stat card                                                                */
/* ----------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="sk-card rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="text-accent">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* States: loading / empty / access                                         */
/* ----------------------------------------------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin", className)} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="space-y-px bg-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 bg-surface px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 animate-pulse rounded bg-accent-soft"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-muted" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AccessRestricted() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <ShieldAlert className="h-8 w-8 text-danger" />
      <p className="mt-3 text-base font-semibold">Access Restricted</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Your role does not have permission to view this module. Contact your
        school admin if you think this is a mistake.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Modal                                                                    */
/* ----------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="sk-animate-fade-in absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="sk-animate-scale-in relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-accent-soft hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Form fields                                                              */
/* ----------------------------------------------------------------------- */

const fieldCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldCls, props.className)} />;
}

/* ----------------------------------------------------------------------- */
/* AI insight card                                                          */
/* ----------------------------------------------------------------------- */

export function AIInsightCard({
  title,
  description,
  buttonLabel = "Generate",
  onRun,
}: {
  title: string;
  description?: string;
  buttonLabel?: string;
  onRun: () => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await onRun());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" /> {title}
          </h3>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Thinking…" : buttonLabel}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {result && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">
          {result}
        </div>
      )}
    </div>
  );
}

/** Inline sparkle button for AI actions. */
export function AIButton({
  loading,
  onClick,
  children,
}: {
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:opacity-50"
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-accent jwad-float" />}
      {children}
    </button>
  );
}

/** Status pill used across modules. */
export function Pill({ tone, children }: { tone: "green" | "red" | "amber" | "gray" | "blue"; children: ReactNode }) {
  const map = {
    green: "bg-green-500/15 text-green-600 dark:text-green-400",
    red: "bg-danger/15 text-danger",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    gray: "bg-accent-soft text-muted",
    blue: "bg-accent/15 text-accent",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", map[tone])}>
      {children}
    </span>
  );
}
