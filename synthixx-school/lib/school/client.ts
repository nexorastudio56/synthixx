"use client";

import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/** Memoised browser Supabase client for the school agent. */
export function sb(): SupabaseClient {
  if (!_client) _client = createClient();
  return _client;
}
