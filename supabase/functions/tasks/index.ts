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
        if (id && id !== 'tasks') {
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid task ID' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          
          const response = formatEntityResponse(data);
          
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // List all tasks with optional filtering
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
        
        const projectId = url.searchParams.get('projectId');
        if (projectId && validateUUID(projectId)) {
          query = query.eq('project_id', projectId);
        }
        
        const status = url.searchParams.get('status');
        if (status) {
          query = query.filter('data->>status', 'eq', status);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const tasks = (data || []).map(t => formatEntityResponse(t));
        
        return new Response(JSON.stringify({ tasks }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        const body = await req.json();
        const validation = validateRequired(body, ['title', 'projectId']);
        if (validation) {
          return new Response(JSON.stringify({ error: validation }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!validateUUID(body.projectId)) {
          return new Response(JSON.stringify({ error: 'Invalid project ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const taskData = {
          ...sanitizeData(body),
          status: body.status || 'todo',
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            project_id: body.projectId,
            data: taskData,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const response = formatEntityResponse(data);
        
        return new Response(JSON.stringify(response), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const updateData: any = { data: sanitizeData(body) };
        
        if (body.projectId !== undefined) {
          updateData.project_id = body.projectId && validateUUID(body.projectId) ? body.projectId : null;
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        
        const response = formatEntityResponse(data);
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('tasks')
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
