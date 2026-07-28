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

/** Money-ish fields the client may send as strings, and may clear with null. */
const MONEY_FIELDS = ['hourlyRate', 'budget'] as const;

export const MAX_HOURLY_RATE = 100_000;

/**
 * Coerce money fields to positive numbers, map 0 / "" / null to null (cleared),
 * and reject values that can't be money. Returns an error message on bad input.
 */
export function normalizeMoneyFields(
  data: Record<string, any>
): { data: Record<string, any>; error?: string } {
  const out = { ...data };
  for (const field of MONEY_FIELDS) {
    if (!(field in out)) continue;
    const raw = out[field];
    if (raw === null || raw === undefined || raw === '') {
      out[field] = null;
      continue;
    }
    const num = typeof raw === 'string' ? Number(raw) : raw;
    if (typeof num !== 'number' || !Number.isFinite(num)) {
      return { data: out, error: `${field} must be a number` };
    }
    if (num < 0) return { data: out, error: `${field} must not be negative` };
    if (field === 'hourlyRate' && num > MAX_HOURLY_RATE) {
      return { data: out, error: `hourlyRate must be at most ${MAX_HOURLY_RATE}` };
    }
    out[field] = num === 0 ? null : Math.round(num * 100) / 100;
  }
  return { data: out };
}

/** Drop keys explicitly set to null so a cleared field leaves the JSONB blob. */
export function mergeEntityData(
  current: Record<string, any> | null | undefined,
  patch: Record<string, any>
): Record<string, any> {
  const merged: Record<string, any> = { ...(current || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged;
}

/**
 * Hourly rate in dollars. JSONB `hourlyRate` and a `hourly_rate` column are
 * already dollars; `hourly_rate_cents` must be divided by 100.
 */
export function rateDollars(row: any): number | undefined {
  const rowData = getData(row);
  const raw = firstDefined(rowData.hourlyRate, row?.hourlyRate, row?.hourly_rate);
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  const cents = row?.hourly_rate_cents;
  if (typeof cents === 'number' && Number.isFinite(cents) && cents > 0) return cents / 100;
  return undefined;
}

/** Budget in dollars, from JSONB, a dollar column, or a cents column. */
export function budgetDollars(row: any): number | undefined {
  const rowData = getData(row);
  const raw = firstDefined(rowData.budget, row?.budget);
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  const cents = row?.budget_cents;
  if (typeof cents === 'number' && Number.isFinite(cents) && cents > 0) return cents / 100;
  return undefined;
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

/**
 * When a session column and its JSONB twin disagree (legacy edge PUT wrote
 * only JSONB), pick the bound that best matches durationSeconds.
 */
function pickConsistentBound(
  columnMs: number | undefined,
  dataMs: number | undefined,
  otherMs: number | undefined,
  durationSeconds: any,
  side: 'start' | 'end'
): number | undefined {
  const col = typeof columnMs === 'number' && Number.isFinite(columnMs) ? columnMs : undefined;
  const data = typeof dataMs === 'number' && Number.isFinite(dataMs) ? dataMs : undefined;
  if (col === undefined) return data;
  if (data === undefined) return col;
  if (Math.abs(col - data) <= 60_000) return col;

  const dur = typeof durationSeconds === 'number' ? durationSeconds : Number(durationSeconds);
  const other = typeof otherMs === 'number' && Number.isFinite(otherMs) ? otherMs : undefined;
  if (!other || !Number.isFinite(dur) || dur <= 0) {
    // Prefer the JSONB value — that's what modern clients write on edit.
    return data;
  }

  const expectedOther = (ms: number) =>
    side === 'start' ? ms + dur * 1000 : ms - dur * 1000;
  const colErr = Math.abs(other - expectedOther(col));
  const dataErr = Math.abs(other - expectedOther(data));
  return dataErr < colErr ? data : col;
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
  addIfDefined(result, 'budget', budgetDollars(row));
  addIfDefined(result, 'hourlyRate', rateDollars(row));
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

  // Session bounds: columns are authoritative once the edge function writes them,
  // but older deployed PUTs only updated data.startedAt in JSONB. When column and
  // JSONB disagree by >60s, prefer the value that agrees with durationSeconds + endedAt.
  if (entityKind === 'session') {
    const colStarted = row.started_at ? new Date(row.started_at).getTime() : undefined;
    const dataStarted = timestampToMillis(rowData.startedAt);
    const colEnded = row.ended_at ? new Date(row.ended_at).getTime() : undefined;
    const dataEnded = timestampToMillis(rowData.endedAt);
    const duration = firstDefined(row.duration_seconds, rowData.durationSeconds);

    result.startedAt = pickConsistentBound(colStarted, dataStarted, colEnded ?? dataEnded, duration, 'start');
    const ended = pickConsistentBound(colEnded, dataEnded, result.startedAt, duration, 'end');
    if (ended !== undefined) result.endedAt = ended;
  } else {
    if (row.started_at) result.startedAt = new Date(row.started_at).getTime();
    if (row.ended_at) result.endedAt = new Date(row.ended_at).getTime();
  }
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
