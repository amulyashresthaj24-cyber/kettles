import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
    }
  );
}

export function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}
