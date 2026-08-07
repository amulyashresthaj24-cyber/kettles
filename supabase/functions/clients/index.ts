import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  validateUUID,
  validateRequired,
  sanitizeData,
  formatEntityResponse,
  normalizeMoneyFields,
  mergeEntityData,
  readJsonBody,
  publicErrorMessage,
} from '../_shared/validators.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function normalizeClientName(name: unknown): string {
  return String(name ?? '').trim().toLowerCase();
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  try {
    switch (req.method) {
      case 'GET': {
        if (id && id !== 'clients') {
          // Get single client
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid client ID' }), {
              status: 400,
              headers: jsonHeaders,
            });
          }
          
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          return new Response(JSON.stringify(formatEntityResponse(data)), {
            headers: jsonHeaders,
          });
        }
        
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ clients: (data || []).map(formatEntityResponse) }), {
          headers: jsonHeaders,
        });
      }

      case 'POST': {
        const parsed = await readJsonBody(req);
        if (parsed.error) {
          return new Response(JSON.stringify({ error: parsed.error }), {
            status: parsed.error === 'Request too large' ? 413 : 400,
            headers: jsonHeaders,
          });
        }
        const body = parsed.body;
        const validation = validateRequired(body, ['name']);
        if (validation) {
          return new Response(JSON.stringify({ error: validation }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const trimmedName = String(body.name).trim();
        if (!trimmedName) {
          return new Response(JSON.stringify({ error: 'name is required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        // Duplicate prevention: return existing client on normalized name match.
        const { data: existingRows, error: listError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id);
        if (listError) throw listError;

        const normalized = normalizeClientName(trimmedName);
        const match = (existingRows || []).find((row: Record<string, unknown>) => {
          const data = (row.data ?? {}) as Record<string, unknown>;
          const n = normalizeClientName(data.name ?? row.name);
          return n === normalized;
        });
        if (match) {
          return new Response(JSON.stringify(formatEntityResponse(match)), {
            status: 200,
            headers: jsonHeaders,
          });
        }

        const money = normalizeMoneyFields(sanitizeData({ ...body, name: trimmedName }));
        if (money.error) {
          return new Response(JSON.stringify({ error: money.error }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const { data, error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            data: mergeEntityData({}, money.data),
          })
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(formatEntityResponse(data)), {
          status: 201,
          headers: jsonHeaders,
        });
      }

      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid client ID' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const parsed = await readJsonBody(req);
        if (parsed.error) {
          return new Response(JSON.stringify({ error: parsed.error }), {
            status: parsed.error === 'Request too large' ? 413 : 400,
            headers: jsonHeaders,
          });
        }
        const body = parsed.body;
        
        const { data: currentData, error: fetchError } = await supabase
          .from('clients')
          .select('data')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) throw fetchError;

        const money = normalizeMoneyFields(sanitizeData(body));
        if (money.error) {
          return new Response(JSON.stringify({ error: money.error }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const mergedData = mergeEntityData(currentData?.data, money.data);
        
        const { data, error } = await supabase
          .from('clients')
          .update({ data: mergedData })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(formatEntityResponse(data)), {
          headers: jsonHeaders,
        });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid client ID' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: jsonHeaders,
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
    }
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: publicErrorMessage(error) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
