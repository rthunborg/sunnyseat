import { createClient } from '@supabase/supabase-js';

/**
 * Creates a one-off Supabase client for health checks.
 * Returns null if env vars are missing (instead of throwing).
 */
export function createHealthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
