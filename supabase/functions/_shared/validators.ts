export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateRequired(data: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function sanitizeData(data: Record<string, any>): Record<string, any> {
  // Remove internal fields that shouldn't be stored in JSONB
  const { id, created_at, updated_at, user_id, client_id, project_id, task_id, ...clean } = data;
  return clean;
}

export function formatEntityResponse(row: any): any {
  if (!row) return null;
  const result = {
    id: row.id,
    ...row.data,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
  
  // Add foreign key references from database columns
  if (row.project_id) result.projectId = row.project_id;
  if (row.client_id) result.clientId = row.client_id;
  if (row.task_id) result.taskId = row.task_id;
  if (row.duration_seconds !== undefined) result.durationSeconds = row.duration_seconds;
  if (row.billable !== undefined) result.billable = row.billable;
  if (row.started_at) result.startedAt = new Date(row.started_at).getTime();
  if (row.ended_at) result.endedAt = new Date(row.ended_at).getTime();
  if (row.paused !== undefined) result.paused = row.paused;
  
  return result;
}
