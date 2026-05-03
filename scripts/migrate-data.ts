#!/usr/bin/env ts-node
/**
 * Data migration script to import existing data.json into Supabase
 * 
 * Usage:
 * 1. Copy .env.example to .env.local and fill in your credentials
 * 2. Run: npx ts-node scripts/migrate-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface DataJSON {
  user: {
    id: string;
    name: string;
    email: string;
    timezone: string;
  };
  clients: Array<{
    id: string;
    name: string;
    email: string;
    hourlyRate: number;
    currency: string;
    address?: string;
    phone?: string;
    notes?: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    clientId: string | null;
    color: string;
    billable: boolean;
    status: string;
    startDate: number;
    endDate: number | null;
    budget: number;
    tags: string[];
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    projectId: string;
    urgency: string;
    status: string;
    estimateMinutes: number;
    actualMinutes: number | null;
    assignees: string[];
    tags: string[];
    dateRange: {
      startDate: number;
      dueDate: number;
      completedAt: number | null;
    };
    createdAt: number;
    updatedAt: number;
  }>;
  sessions: Array<{
    id: string;
    taskId: string;
    projectId: string;
    billable: boolean;
    startedAt: number;
    pausedAt: number | null;
    endedAt: number | null;
    durationSeconds: number;
    paused: boolean;
    notes: string;
  }>;
}

async function migrate() {
  console.log('Loading data.json...');
  const dataPath = path.join(__dirname, '../public/data.json');
  const data: DataJSON = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log('Creating test user account...');
  const email = data.user.email || 'test@example.com';
  const password = 'temp-password-123'; // User should change this after first login

  // Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: data.user.name,
    }
  });

  if (authError) {
    console.error('Failed to create user:', authError.message);
    console.log('User may already exist. Attempting to get existing user...');
    
    // Try to sign in to get user ID
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('Could not authenticate:', signInError.message);
      process.exit(1);
    }
    
    var userId = signInData.user!.id;
  } else {
    var userId = authData.user!.id;
    console.log(`Created user: ${email} (ID: ${userId})`);
    console.log(`Temporary password: ${password}`);
    console.log('IMPORTANT: Change this password after first login!');
  }

  // Wait for trigger to create user record
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\nMigrating clients...');
  for (const client of data.clients) {
    const { error } = await supabase.from('clients').insert({
      id: client.id,
      user_id: userId,
      data: {
        name: client.name,
        email: client.email,
        hourlyRate: client.hourlyRate,
        currency: client.currency,
        address: client.address,
        phone: client.phone,
        notes: client.notes,
      },
    });
    if (error) console.error(`Failed to insert client ${client.id}:`, error.message);
    else console.log(`  ✓ ${client.name}`);
  }

  console.log('\nMigrating projects...');
  for (const project of data.projects) {
    const { error } = await supabase.from('projects').insert({
      id: project.id,
      user_id: userId,
      client_id: project.clientId,
      data: {
        name: project.name,
        description: project.description,
        color: project.color,
        billable: project.billable,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        tags: project.tags,
      },
    });
    if (error) console.error(`Failed to insert project ${project.id}:`, error.message);
    else console.log(`  ✓ ${project.name}`);
  }

  console.log('\nMigrating tasks...');
  for (const task of data.tasks) {
    // Normalize legacy status values
    const normalizedStatus = task.status === 'in_progress' ? 'doing' : task.status;

    // Normalize legacy dateRange object to string and extract nested completedAt
    let dateRange: string | undefined = undefined;
    let completedAt: number | null | undefined = task.dateRange?.completedAt ?? null;
    if (task.dateRange && typeof task.dateRange === 'object') {
      if (task.dateRange.dueDate) {
        const d = new Date(task.dateRange.dueDate);
        if (!isNaN(d.getTime())) dateRange = d.toISOString().split('T')[0];
      } else if (task.dateRange.startDate) {
        const d = new Date(task.dateRange.startDate);
        if (!isNaN(d.getTime())) dateRange = d.toISOString().split('T')[0];
      }
    }

    const { error } = await supabase.from('tasks').insert({
      id: task.id,
      user_id: userId,
      project_id: task.projectId,
      data: {
        title: task.title,
        description: task.description,
        urgency: task.urgency,
        status: normalizedStatus,
        estimateMinutes: task.estimateMinutes,
        actualMinutes: task.actualMinutes,
        assignees: task.assignees,
        tags: task.tags,
        dateRange,
        completedAt: completedAt || undefined,
      },
    });
    if (error) console.error(`Failed to insert task ${task.id}:`, error.message);
    else console.log(`  ✓ ${task.title}`);
  }

  console.log('\nMigrating sessions...');
  for (const session of data.sessions) {
    const { error } = await supabase.from('sessions').insert({
      id: session.id,
      user_id: userId,
      task_id: session.taskId,
      project_id: session.projectId,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      duration_seconds: session.durationSeconds,
      billable: session.billable,
      data: {
        notes: session.notes,
        paused: session.paused,
      },
    });
    if (error) console.error(`Failed to insert session ${session.id}:`, error.message);
    else console.log(`  ✓ Session ${session.id.slice(0, 8)}... (${session.durationSeconds}s)`);
  }

  console.log('\n✅ Migration complete!');
  console.log(`\nLogin with:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
