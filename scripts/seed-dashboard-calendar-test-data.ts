#!/usr/bin/env ts-node

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(12, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

function at(offsetDays: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function getSeedUserId() {
  const { data: publicUsers, error: publicUsersError } = await supabase
    .from("users")
    .select("id")
    .limit(1);

  if (publicUsersError) throw publicUsersError;
  if (publicUsers?.[0]?.id) return publicUsers[0].id as string;

  const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (authUsersError) throw authUsersError;
  const authUser = authUsers.users[0];
  if (!authUser) throw new Error("No Supabase user found to attach test data to.");

  const { error: insertUserError } = await supabase.from("users").insert({
    id: authUser.id,
    data: {
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Test User",
    },
  });

  if (insertUserError) throw insertUserError;
  return authUser.id;
}

async function main() {
  const userId = await getSeedUserId();
  const batch = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12);

  const clientId = randomUUID();
  const { error: clientError } = await supabase.from("clients").insert({
    id: clientId,
    user_id: userId,
    data: {
      name: `QA Calendar Client ${batch}`,
      email: "qa-calendar@example.com",
      hourlyRate: 7500,
      notes: "Seeded for dashboard and calendar verification.",
    },
  });
  if (clientError) throw clientError;

  const projectSpecs = [
    { id: randomUUID(), name: `QA Today Project ${batch}`, color: "teal", billable: true },
    { id: randomUUID(), name: `QA Week Project ${batch}`, color: "amber", billable: true },
    { id: randomUUID(), name: `QA Future Project ${batch}`, color: "indigo", billable: false },
  ];

  const { error: projectsError } = await supabase.from("projects").insert(
    projectSpecs.map((project) => ({
      id: project.id,
      user_id: userId,
      client_id: clientId,
      data: {
        name: project.name,
        color: project.color,
        billable: project.billable,
        status: "active",
        description: "Seeded test project.",
        tags: ["qa", "calendar"],
      },
    }))
  );
  if (projectsError) throw projectsError;

  const taskSpecs = [
    {
      id: randomUUID(),
      projectId: projectSpecs[0].id,
      title: `QA Today Task ${batch}`,
      status: "todo",
      urgency: "urgent",
      estimateMinutes: 45,
      dateRange: isoDate(0),
      createdAt: at(0, 9).getTime(),
    },
    {
      id: randomUUID(),
      projectId: projectSpecs[1].id,
      title: `QA Week Done Task ${batch}`,
      status: "done",
      urgency: "normal",
      estimateMinutes: 60,
      dateRange: isoDate(-2),
      createdAt: at(-2, 10).getTime(),
      completedAt: at(-2, 11).getTime(),
    },
    {
      id: randomUUID(),
      projectId: projectSpecs[2].id,
      title: `QA Future Task ${batch}`,
      status: "todo",
      urgency: "high",
      estimateMinutes: 90,
      dateRange: isoDate(6),
      createdAt: at(6, 14).getTime(),
    },
  ];

  const { error: tasksError } = await supabase.from("tasks").insert(
    taskSpecs.map((task) => ({
      id: task.id,
      user_id: userId,
      project_id: task.projectId,
      data: {
        title: task.title,
        status: task.status,
        urgency: task.urgency,
        estimateMinutes: task.estimateMinutes,
        dateRange: task.dateRange,
        completedAt: task.completedAt,
        tags: ["qa", "calendar"],
      },
      created_at: new Date(task.createdAt).toISOString(),
    }))
  );
  if (tasksError) throw tasksError;

  const sessionSpecs = [
    {
      taskId: taskSpecs[0].id,
      projectId: projectSpecs[0].id,
      startedAt: at(0, 9, 15),
      endedAt: at(0, 10, 0),
      durationSeconds: 45 * 60,
      billable: true,
    },
    {
      taskId: taskSpecs[1].id,
      projectId: projectSpecs[1].id,
      startedAt: at(-2, 10, 0),
      endedAt: at(-2, 11, 0),
      durationSeconds: 60 * 60,
      billable: true,
    },
  ];

  const { error: sessionsError } = await supabase.from("sessions").insert(
    sessionSpecs.map((session) => ({
      id: randomUUID(),
      user_id: userId,
      task_id: session.taskId,
      project_id: session.projectId,
      started_at: session.startedAt.toISOString(),
      ended_at: session.endedAt.toISOString(),
      duration_seconds: session.durationSeconds,
      billable: session.billable,
      data: {
        notes: "Seeded dashboard/calendar verification session.",
        paused: false,
      },
    }))
  );
  if (sessionsError) throw sessionsError;

  console.log(`Seeded dashboard/calendar QA data for user ${userId}.`);
  console.log(`Batch: ${batch}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
