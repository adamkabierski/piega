/**
 * Supabase Client
 *
 * Singleton Supabase client for piega-agents.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    );
  }

  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return _client;
}
