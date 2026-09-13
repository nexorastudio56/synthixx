import type { NextRequest } from "next/server";

/** Canonical app origin for OAuth redirects (server). */
export function getSiteUrl(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
    return request.nextUrl.origin;
  }

  return "http://localhost:3000";
}

/** Browser-safe origin for Supabase redirectTo. */
export function getClientSiteUrl(): string {
  if (typeof window !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    return fromEnv || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function authCallbackUrl(next: string, request?: NextRequest): string {
  const base = getSiteUrl(request);
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
