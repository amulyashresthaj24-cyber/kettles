import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import {
  validateUUID,
  validateRequired,
  sanitizeData,
  formatEntityResponse,
  assertOwnedRow,
  readJsonBody,
  publicErrorMessage,
} from '../_shared/validators.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

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
        if (id && id !== 'tasks') {
          if (!validateUUID(id)) {
            return new Response(JSON.stringify({ error: 'Invalid task ID' }), {
              status: 400,
              headers: jsonHeaders,
            });
          }
          
          const { data, error } = await supabase
            .from('tasks')
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
          .from('tasks')
          .select('*')
          .eq('user_id', user.id);
        
        const projectId = url.searchParams.get('projectId');
        if (projectId && validateUUID(projectId)) {
          query = query.eq('project_id', projectId);
        }
        
        const status = url.searchParams.get('status');
        if (status && ['todo', 'doing', 'done'].includes(status)) {
          query = query.filter('data->>status', 'eq', status);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ tasks: (data || []).map(formatEntityResponse) }), {
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
        const validation = validateRequired(body, ['title']);
        if (validation) {
          return new Response(JSON.stringify({ error: validation }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const projectErr = await assertOwnedRow(
          supabase,
          'projects',
          body.projectId || null,
          user.id,
          'project ID'
        );
        if (projectErr) {
          return new Response(JSON.stringify({ error: projectErr }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const taskData = {
          ...sanitizeData(body),
          status: body.status === 'in_progress' ? 'doing' : (body.status || 'todo'),
        };

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            project_id: body.projectId || null,
            data: taskData,
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
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid task ID' }), {
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
          .from('tasks')
          .select('data')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const sanitized = sanitizeData(body);
        if (sanitized.status === 'in_progress') {
          sanitized.status = 'doing';
        }
        const mergedData = {
          ...(currentData?.data || {}),
          ...sanitized,
        };
        
        const updateData: any = { data: mergedData };
        
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
          .from('tasks')
          .update(updateData)
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
          return new Response(JSON.stringify({ error: 'Task ID required' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }
        if (!validateUUID(id)) {
          return new Response(JSON.stringify({ error: 'Invalid task ID' }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        const { error } = await supabase
          .from('tasks')
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
