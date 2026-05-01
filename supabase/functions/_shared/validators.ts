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
  return {
    id: row.id,
    ...row.data,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
