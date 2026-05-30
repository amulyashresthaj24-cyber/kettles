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
        if (id && id !== 'sessions') {
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data, error } = await supabase
            .from('sessions')
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
        
        // List sessions with optional filters
        let query = supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id);
        
        const taskId = url.searchParams.get('taskId');
        if (taskId && validateUUID(taskId)) {
          query = query.eq('task_id', taskId);
        }
        
        const projectId = url.searchParams.get('projectId');
        if (projectId && validateUUID(projectId)) {
          query = query.eq('project_id', projectId);
        }
        
        const activeOnly = url.searchParams.get('active') === 'true';
        if (activeOnly) {
          query = query.is('ended_at', null);
        }
        
        const { data, error } = await query.order('started_at', { ascending: false });
        
        if (error) throw error;
        
        const sessions = (data || []).map(s => formatEntityResponse(s));
        
        return new Response(JSON.stringify({ sessions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        const body = await req.json();
        
        const insertData: any = {
          user_id: user.id,
          started_at: new Date(body.startedAt || Date.now()).toISOString(),
          duration_seconds: body.durationSeconds || 0,
          billable: body.billable || false,
          data: sanitizeData(body),
        };
        
        if (body.taskId && validateUUID(body.taskId)) {
          insertData.task_id = body.taskId;
        }
        if (body.projectId && validateUUID(body.projectId)) {
          insertData.project_id = body.projectId;
        }
        if (body.endedAt) {
          insertData.ended_at = new Date(body.endedAt).toISOString();
        }

        const { data, error } = await supabase
          .from('sessions')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        
        const response = formatEntityResponse(data);
        response.taskId = data.task_id;
        response.projectId = data.project_id;
        response.durationSeconds = data.duration_seconds;
        response.billable = data.billable;
        response.startedAt = new Date(data.started_at).getTime();
        response.endedAt = data.ended_at ? new Date(data.ended_at).getTime() : undefined;
        
        return new Response(JSON.stringify(response), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        
        // Fetch current session to merge data
        const { data: currentData, error: fetchError } = await supabase
          .from('sessions')
          .select('data')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          throw fetchError;
        }
        
        // Merge new data with existing data instead of replacing
        const mergedData = {
          ...currentData?.data,
          ...sanitizeData(body),
        };
        
        const updateData: any = {
          data: mergedData,
        };
        
        if (body.durationSeconds !== undefined) {
          updateData.duration_seconds = body.durationSeconds;
        }
        if (body.billable !== undefined) {
          updateData.billable = body.billable;
        }
        if (body.startedAt !== undefined) {
          updateData.started_at = new Date(body.startedAt).toISOString();
        }
        if (body.endedAt !== undefined) {
          updateData.ended_at = body.endedAt ? new Date(body.endedAt).toISOString() : null;
        }
        if (body.taskId !== undefined) {
          updateData.task_id = body.taskId && validateUUID(body.taskId) ? body.taskId : null;
        }
        if (body.projectId !== undefined) {
          updateData.project_id = body.projectId && validateUUID(body.projectId) ? body.projectId : null;
        }

        const { data, error } = await supabase
          .from('sessions')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        
        const response = formatEntityResponse(data);
        response.taskId = data.task_id;
        response.projectId = data.project_id;
        response.durationSeconds = data.duration_seconds;
        response.billable = data.billable;
        response.startedAt = new Date(data.started_at).getTime();
        response.endedAt = data.ended_at ? new Date(data.ended_at).getTime() : undefined;
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('sessions')
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
