/**
 * Service Role Supabase Client
 * For server-side operations that don't require user context (cron jobs, admin tasks)
 * Uses service role key with full access
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role privileges
 * WARNING: This bypasses RLS policies - use only for trusted server-side operations
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
