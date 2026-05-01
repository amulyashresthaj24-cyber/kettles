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
        if (id && id !== 'projects') {
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid project ID' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data, error } = await supabase
            .from('projects')
            .select('*, clients(data)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          
          const response = formatEntityResponse(data);
          if (data.clients) {
            response.client = formatEntityResponse(data.clients);
          }
          
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const { data, error } = await supabase
          .from('projects')
          .select('*, clients(data)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const projects = (data || []).map(p => {
          const proj = formatEntityResponse(p);
          if (p.clients) {
            proj.client = formatEntityResponse(p.clients);
            proj.clientId = p.client_id;
          }
          return proj;
        });
        
        return new Response(JSON.stringify({ projects }), {
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

        const insertData: any = {
          user_id: user.id,
          data: sanitizeData(body),
        };

        if (body.clientId && validateUUID(body.clientId)) {
          insertData.client_id = body.clientId;
        }

        const { data, error } = await supabase
          .from('projects')
          .insert(insertData)
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
          return new Response(JSON.stringify({ error: 'Project ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const updateData: any = { data: sanitizeData(body) };
        
        if (body.clientId !== undefined) {
          updateData.client_id = body.clientId && validateUUID(body.clientId) ? body.clientId : null;
        }

        const { data, error } = await supabase
          .from('projects')
          .update(updateData)
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
          return new Response(JSON.stringify({ error: 'Project ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('projects')
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
