import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded even in Playwright worker processes.
// Config-level dotenv may not propagate to workers on all platforms.
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'E2E Supabase helper: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. ' +
    'Check that .env.test (or .env.local / .env) exists in nextjs-app/ with these values.'
  );
}

/**
 * Supabase admin client for direct DB access in E2E tests.
 */
export const supabase = createClient(supabaseUrl, serviceRoleKey);
