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

function timestampToMillis(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function addIfDefined(target: Record<string, any>, key: string, value: any) {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}

function getData(row: any): Record<string, any> {
  if (!row?.data) return {};
  if (typeof row.data === 'object' && !Array.isArray(row.data)) return row.data;
  return {};
}

function getEntityKind(row: any): 'client' | 'project' | 'task' | 'session' | 'unknown' {
  if (row.started_at !== undefined || row.duration_seconds !== undefined || row.task_id !== undefined) {
    return 'session';
  }
  if (row.project_id !== undefined) {
    return 'task';
  }
  if (row.client_id !== undefined) {
    return 'project';
  }
  if (row.email !== undefined || row.hourly_rate !== undefined || row.hourly_rate_cents !== undefined) {
    return 'client';
  }
  return 'unknown';
}

function fallbackLabel(prefix: string, id: string | undefined) {
  const suffix = id ? id.slice(0, 8) : 'new-data';
  return `${prefix} ${suffix}`;
}

export function formatEntityResponse(row: any): any {
  if (!row) return null;
  const rowData = getData(row);
  const entityKind = getEntityKind(row);
  const result = {
    id: row.id,
    ...rowData,
    createdAt: timestampToMillis(firstDefined(row.created_at, rowData.createdAt)),
    updatedAt: timestampToMillis(firstDefined(row.updated_at, rowData.updatedAt)),
  };

  // Support both JSONB-backed rows and normalized column-backed rows. Some
  // deployed data uses real columns, so display fields must not depend on
  // row.data being populated.
  addIfDefined(result, 'name', firstDefined(row.name, rowData.name));
  addIfDefined(result, 'title', firstDefined(row.title, rowData.title));
  addIfDefined(result, 'description', firstDefined(row.description, rowData.description));
  addIfDefined(result, 'email', firstDefined(row.email, rowData.email));
  addIfDefined(result, 'phone', firstDefined(row.phone, rowData.phone));
  addIfDefined(result, 'company', firstDefined(row.company, rowData.company));
  addIfDefined(result, 'notes', firstDefined(row.notes, rowData.notes));
  addIfDefined(result, 'color', firstDefined(row.color, rowData.color));
  addIfDefined(result, 'status', firstDefined(row.status, rowData.status));
  addIfDefined(result, 'urgency', firstDefined(row.urgency, rowData.urgency));
  addIfDefined(result, 'tags', firstDefined(row.tags, rowData.tags));
  addIfDefined(result, 'assignees', firstDefined(row.assignees, rowData.assignees));
  addIfDefined(result, 'archived', firstDefined(row.archived, rowData.archived));
  addIfDefined(result, 'budget', firstDefined(row.budget, row.budget_cents, rowData.budget));
  addIfDefined(result, 'hourlyRate', firstDefined(row.hourlyRate, row.hourly_rate, row.hourly_rate_cents, rowData.hourlyRate));
  addIfDefined(result, 'estimateMinutes', firstDefined(row.estimateMinutes, row.estimate_minutes, rowData.estimateMinutes));
  addIfDefined(result, 'actualMinutes', firstDefined(row.actualMinutes, row.actual_minutes, rowData.actualMinutes));

  const dateRange = firstDefined(row.dateRange, row.date_range, row.due_date, row.start_date, rowData.dateRange);
  addIfDefined(result, 'dateRange', dateRange);
  addIfDefined(result, 'startDate', timestampToMillis(firstDefined(row.startDate, row.start_date, rowData.startDate)));
  addIfDefined(result, 'endDate', timestampToMillis(firstDefined(row.endDate, row.end_date, rowData.endDate)));
  addIfDefined(result, 'completedAt', timestampToMillis(firstDefined(row.completedAt, row.completed_at, rowData.completedAt)));
  addIfDefined(result, 'archivedAt', timestampToMillis(firstDefined(row.archivedAt, row.archived_at, rowData.archivedAt)));
  addIfDefined(result, 'deletedAt', timestampToMillis(firstDefined(row.deletedAt, row.deleted_at, rowData.deletedAt)));
  
  // Add foreign key references from database columns
  if (row.project_id) result.projectId = row.project_id;
  if (row.client_id) result.clientId = row.client_id;
  if (row.task_id) result.taskId = row.task_id;
  if (row.duration_seconds !== undefined) result.durationSeconds = row.duration_seconds;
  if (row.billable !== undefined) result.billable = row.billable;
  if (row.started_at) result.startedAt = new Date(row.started_at).getTime();
  if (row.ended_at) result.endedAt = new Date(row.ended_at).getTime();
  if (row.paused !== undefined) result.paused = row.paused;
  
  // Handle timestamp fields from JSONB data
  if (result.completedAt && typeof result.completedAt === 'string') {
    result.completedAt = new Date(result.completedAt).getTime();
  }
  if (result.archivedAt && typeof result.archivedAt === 'string') {
    result.archivedAt = new Date(result.archivedAt).getTime();
  }
  if (result.deletedAt && typeof result.deletedAt === 'string') {
    result.deletedAt = new Date(result.deletedAt).getTime();
  }

  // Normalize legacy task status values
  if (result.status === 'in_progress') {
    result.status = 'doing';
  }

  if (entityKind === 'task') {
    if (!result.title || (typeof result.title === 'string' && !result.title.trim())) {
      result.title = fallbackLabel('New test task', row.id);
    }
    if (!result.urgency) {
      result.urgency = 'normal';
    }
    if (!result.status) {
      result.status = 'todo';
    }
  }

  if (entityKind === 'project') {
    if (!result.name || (typeof result.name === 'string' && !result.name.trim())) {
      result.name = fallbackLabel('New test project', row.id);
    }
    if (!result.color) {
      result.color = 'indigo';
    }
    if (result.billable === undefined) {
      result.billable = false;
    }
  }

  if (entityKind === 'client' && (!result.name || (typeof result.name === 'string' && !result.name.trim()))) {
    result.name = fallbackLabel('New test client', row.id);
  }

  if (entityKind === 'session') {
    addIfDefined(result, 'taskTitle', firstDefined(row.task_title, rowData.taskTitle, rowData.title));
    addIfDefined(result, 'projectName', firstDefined(row.project_name, rowData.projectName));
  }

  // Normalize legacy dateRange object to string and extract nested completedAt
  if (result.dateRange && typeof result.dateRange === 'object') {
    if (result.dateRange.dueDate) {
      const due = typeof result.dateRange.dueDate === 'number'
        ? new Date(result.dateRange.dueDate)
        : new Date(result.dateRange.dueDate);
      if (!isNaN(due.getTime())) {
        result.dateRange = due.toISOString().split('T')[0];
      }
    } else if (result.dateRange.startDate) {
      const start = typeof result.dateRange.startDate === 'number'
        ? new Date(result.dateRange.startDate)
        : new Date(result.dateRange.startDate);
      if (!isNaN(start.getTime())) {
        result.dateRange = start.toISOString().split('T')[0];
      }
    } else {
      result.dateRange = undefined;
    }
    // Extract nested completedAt if top-level is missing
    if (!result.completedAt && row.data?.dateRange?.completedAt) {
      const comp = typeof row.data.dateRange.completedAt === 'number'
        ? row.data.dateRange.completedAt
        : new Date(row.data.dateRange.completedAt).getTime();
      if (!isNaN(comp)) {
        result.completedAt = comp;
      }
    }
  }
  
  return result;
}
