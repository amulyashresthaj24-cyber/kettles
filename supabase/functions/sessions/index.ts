import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  validateUUID,
  sanitizeData,
  formatEntityResponse,
  assertOwnedRow,
  readJsonBody,
  publicErrorMessage,
} from '../_shared/validators.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function sessionResponse(data: any) {
  const response = formatEntityResponse(data);
  response.taskId = data.task_id;
  response.projectId = data.project_id;
  response.durationSeconds = data.duration_seconds;
  response.billable = data.billable;
  response.startedAt = new Date(data.started_at).getTime();
  response.endedAt = data.ended_at ? new Date(data.ended_at).getTime() : undefined;
  return response;
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
        if (id && id !== 'sessions') {
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
              status: 400,
              headers: jsonHeaders,
            });
          }
          
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          
          return new Response(JSON.stringify(formatEntityResponse(data)), {
            headers: jsonHeaders,
          });
        }
        
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
        
        return new Response(JSON.stringify({ sessions: (data || []).map(formatEntityResponse) }), {
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

        const taskErr = await assertOwnedRow(supabase, 'tasks', body.taskId, user.id, 'task ID');
        if (taskErr) {
          return new Response(JSON.stringify({ error: taskErr }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        const projectErr = await assertOwnedRow(
          supabase,
          'projects',
          body.projectId,
          user.id,
          'project ID'
        );
        if (projectErr) {
          return new Response(JSON.stringify({ error: projectErr }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const duration =
          typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
            ? Math.max(0, Math.floor(body.durationSeconds))
            : 0;
        
        const insertData: any = {
          user_id: user.id,
          started_at: new Date(body.startedAt || Date.now()).toISOString(),
          duration_seconds: duration,
          billable: Boolean(body.billable),
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
        
        return new Response(JSON.stringify(sessionResponse(data)), {
          status: 201,
          headers: jsonHeaders,
        });
      }

      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
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
          .from('sessions')
          .select('data')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) {
          if ((fetchError as { code?: string }).code === 'PGRST116') {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
              status: 404,
              headers: jsonHeaders,
            });
          }
          throw fetchError;
        }
        
        const mergedData = {
          ...currentData?.data,
          ...sanitizeData(body),
        };
        
        const updateData: any = {
          data: mergedData,
        };
        
        if (body.durationSeconds !== undefined) {
          const duration = Number(body.durationSeconds);
          if (!Number.isFinite(duration) || duration < 0) {
            return new Response(JSON.stringify({ error: 'durationSeconds must be a non-negative number' }), {
              status: 400,
              headers: jsonHeaders,
            });
          }
          updateData.duration_seconds = Math.floor(duration);
        }
        if (body.billable !== undefined) {
          updateData.billable = Boolean(body.billable);
        }
        if (body.startedAt !== undefined) {
          updateData.started_at = new Date(body.startedAt).toISOString();
        }
        if (body.endedAt !== undefined) {
          updateData.ended_at = body.endedAt ? new Date(body.endedAt).toISOString() : null;
        }
        if (body.taskId !== undefined) {
          if (body.taskId) {
            const taskErr = await assertOwnedRow(supabase, 'tasks', body.taskId, user.id, 'task ID');
            if (taskErr) {
              return new Response(JSON.stringify({ error: taskErr }), {
                status: 400,
                headers: jsonHeaders,
              });
            }
            updateData.task_id = body.taskId;
          } else {
            updateData.task_id = null;
          }
        }
        if (body.projectId !== undefined) {
          if (body.projectId) {
            const projectErr = await assertOwnedRow(
              supabase,
              'projects',
              body.projectId,
              user.id,
              'project ID'
            );
            if (projectErr) {
              return new Response(JSON.stringify({ error: projectErr }), {
                status: 400,
                headers: jsonHeaders,
              });
            }
            updateData.project_id = body.projectId;
          } else {
            updateData.project_id = null;
          }
        }

        const { data, error } = await supabase
          .from('sessions')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(JSON.stringify(sessionResponse(data)), {
          headers: jsonHeaders,
        });
      }

      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid session ID' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const { error } = await supabase
          .from('sessions')
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
