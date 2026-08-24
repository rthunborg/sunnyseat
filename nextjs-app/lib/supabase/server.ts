import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createObservedSupabaseFetch } from '@/lib/observability/supabase-fetch-observer';

let _supabaseServiceRole: SupabaseClient | null = null;

export function getSupabaseServiceRole(): SupabaseClient {
  if (_supabaseServiceRole) return _supabaseServiceRole;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
  }

  _supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: createObservedSupabaseFetch(supabaseUrl),
    },
  });

  return _supabaseServiceRole;
}

// Lazily initialized server-only client using the service-role key.
export const supabaseServiceRole = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseServiceRole(), prop);
  },
});
