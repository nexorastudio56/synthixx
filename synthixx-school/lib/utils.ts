import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Human friendly remaining-time string, e.g. "2 days left", "5 hours left". */
export function timeRemaining(expiresAt: Date | string | null): string {
  if (!expiresAt) return "No active plan";
  const end = new Date(expiresAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} left`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} left`;
  return `${mins} minute${mins !== 1 ? "s" : ""} left`;
}
