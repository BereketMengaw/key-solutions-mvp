'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

let client: SupabaseClient<Database> | undefined;

/** One browser client per tab (session in cookies, shared with the server). */
export function getSupabase(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
