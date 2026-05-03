import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { validateUUID, validateRequired, sanitizeData, formatEntityResponse } from '../_shared/validators.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getSupabaseClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // List all clients
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return new Response(JSON.stringify({ clients: (data || []).map(formatEntityResponse) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        const body = await req.json();
        const validation = validateRequired(body, ['name']);
        if (validation) {
          return new Response(JSON.stringify({ error: validation }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            data: sanitizeData(body),
          })
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(formatEntityResponse(data)), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        
        // Fetch current client to merge data
        const { data: currentData, error: fetchError } = await supabase
          .from('clients')
          .select('data')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Merge new data with existing data instead of replacing
        const mergedData = {
          ...currentData?.data,
          ...sanitizeData(body),
        };
        
        const { data, error } = await supabase
          .from('clients')
          .update({ data: mergedData })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return new Response(JSON.stringify(formatEntityResponse(data)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Client ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: corsHeaders,
        });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
