import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { rateDollars, publicErrorMessage } from '../_shared/validators.ts';

/**
 * Project ID -> effective hourly rate in dollars. Mirrors the client pipeline
 * in src/lib/rates.ts: project rate wins over client rate, unset earns nothing.
 */
async function loadProjectRates(
  supabase: any,
  userId: string
): Promise<Map<string, number>> {
  const [{ data: projects, error: projectsError }, { data: clients, error: clientsError }] =
    await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('clients').select('*').eq('user_id', userId),
    ]);

  if (projectsError) throw projectsError;
  if (clientsError) throw clientsError;

  const clientRates = new Map<string, number>();
  (clients || []).forEach((c: any) => {
    const rate = rateDollars(c);
    if (rate != null) clientRates.set(c.id, rate);
  });

  const projectRates = new Map<string, number>();
  (projects || []).forEach((p: any) => {
    const own = rateDollars(p);
    const rate = own ?? (p.client_id ? clientRates.get(p.client_id) : undefined);
    if (rate != null && rate > 0) projectRates.set(p.id, rate);
  });
  return projectRates;
}

function earningsCents(seconds: number, dollarsPerHour: number): number {
  if (!(dollarsPerHour > 0) || !(seconds > 0)) return 0;
  return Math.round(dollarsPerHour * 100 * (seconds / 3600));
}

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
  const type = url.searchParams.get('type') || 'dashboard';

  try {
    switch (type) {
      case 'dashboard': {
        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        const { data: todaySessions, error: todayError } = await supabase
          .from('sessions')
          .select('duration_seconds, billable')
          .eq('user_id', user.id)
          .gte('started_at', todayISO);
        
        if (todayError) throw todayError;

        // Get week stats
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartISO = weekStart.toISOString();
        
        const { data: weekSessions, error: weekError } = await supabase
          .from('sessions')
          .select('duration_seconds, billable, project_id')
          .eq('user_id', user.id)
          .gte('started_at', weekStartISO);
        
        if (weekError) throw weekError;

        // Get task stats
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('data')
          .eq('user_id', user.id);
        
        if (tasksError) throw tasksError;

        // Calculate stats
        const todayTracked = todaySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
        const weekTracked = weekSessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
        
        const weekBillableSeconds = weekSessions
          ?.filter(s => s.billable)
          .reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;

        const taskStats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.data?.status === 'done').length || 0,
          inProgress: tasks?.filter(t => t.data?.status === 'doing' || t.data?.status === 'in_progress').length || 0,
          todo: tasks?.filter(t => t.data?.status === 'todo').length || 0,
        };

        const projectRates = await loadProjectRates(supabase, user.id);

        const weekBillableCents = weekSessions
          ?.filter(s => s.billable)
          .reduce((acc, s) => {
            const rate = s.project_id ? projectRates.get(s.project_id) ?? 0 : 0;
            return acc + earningsCents(s.duration_seconds || 0, rate);
          }, 0) || 0;

        return new Response(JSON.stringify({
          todayTracked: {
            seconds: todayTracked,
            minutes: Math.floor(todayTracked / 60),
            hours: (todayTracked / 3600).toFixed(1),
            sessions: todaySessions?.length || 0,
          },
          weekTracked: {
            seconds: weekTracked,
            minutes: Math.floor(weekTracked / 60),
            hours: (weekTracked / 3600).toFixed(1),
            sessions: weekSessions?.length || 0,
          },
          weekBillable: {
            seconds: weekBillableSeconds,
            minutes: Math.floor(weekBillableSeconds / 60),
            hours: (weekBillableSeconds / 3600).toFixed(1),
            sessions: weekSessions?.filter(s => s.billable).length || 0,
            cents: weekBillableCents,
            dollars: (weekBillableCents / 100).toFixed(2),
          },
          taskStats: {
            ...taskStats,
            completionRate: taskStats.total > 0 
              ? Math.round((taskStats.completed / taskStats.total) * 100) 
              : 0,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'projects': {
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('project_id, duration_seconds, billable, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false });
        
        if (error) throw error;

        const rates = await loadProjectRates(supabase, user.id);

        // Group by project
        const projectStats = sessions?.reduce((acc, s) => {
          const pid = s.project_id || 'unassigned';
          if (!acc[pid]) {
            acc[pid] = { 
              totalSeconds: 0, 
              billableSeconds: 0, 
              sessions: 0,
              hourlyRate: rates.get(pid) ?? 0,
              earningsCents: 0,
              lastSession: s.started_at 
            };
          }
          acc[pid].totalSeconds += s.duration_seconds || 0;
          if (s.billable) {
            acc[pid].billableSeconds += s.duration_seconds || 0;
            acc[pid].earningsCents += earningsCents(s.duration_seconds || 0, acc[pid].hourlyRate);
          }
          acc[pid].sessions++;
          if (s.started_at > acc[pid].lastSession) {
            acc[pid].lastSession = s.started_at;
          }
          return acc;
        }, {} as Record<string, any>);

        return new Response(JSON.stringify({ projectStats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'time-distribution': {
        const days = parseInt(url.searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('started_at, duration_seconds, billable')
          .eq('user_id', user.id)
          .gte('started_at', startDate.toISOString())
          .order('started_at', { ascending: true });
        
        if (error) throw error;

        // Group by date
        const dailyStats = sessions?.reduce((acc, s) => {
          const date = s.started_at.split('T')[0];
          if (!acc[date]) {
            acc[date] = { total: 0, billable: 0, sessions: 0 };
          }
          acc[date].total += s.duration_seconds || 0;
          if (s.billable) acc[date].billable += s.duration_seconds || 0;
          acc[date].sessions++;
          return acc;
        }, {} as Record<string, any>);

        return new Response(JSON.stringify({ dailyStats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown analytics type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: publicErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
