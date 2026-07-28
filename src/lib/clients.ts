import type { Client, Project } from "@/lib/types";

/** Trim + lowercase for case-insensitive client name matching. */
export function normalizeClientName(name: string): string {
  return name.trim().toLowerCase();
}

/** Find an existing client by normalized name, or undefined. */
export function findClientByNormalizedName(
  clients: Client[],
  name: string
): Client | undefined {
  const key = normalizeClientName(name);
  if (!key) return undefined;
  return clients.find((c) => normalizeClientName(c.name) === key);
}

/**
 * Resolve a project’s single assigned client.
 * Returns undefined when unassigned or the client was deleted.
 */
export function getProjectClient(
  project: Pick<Project, "clientId"> | null | undefined,
  clients: Client[]
): Client | undefined {
  const id = project?.clientId;
  if (!id) return undefined;
  return clients.find((c) => c.id === id);
}

/** Display name for the project’s linked client (empty when unassigned). */
export function getProjectClientName(
  project: Pick<Project, "clientId"> | null | undefined,
  clients: Client[]
): string {
  return getProjectClient(project, clients)?.name ?? "";
}

/** Normalize create/update payload: empty string → null (clear), keep valid ids. */
export function toProjectClientId(
  clientId: string | null | undefined
): string | null | undefined {
  if (clientId === undefined) return undefined;
  if (clientId === null || clientId === "") return null;
  return clientId;
}

/**
 * Apply a project patch, treating `clientId: null` as an explicit unassign
 * so the field does not linger after a clear.
 */
export function applyProjectClientPatch<T extends Pick<Project, "clientId">>(
  project: T,
  patch: Partial<Pick<Project, "clientId">>
): T {
  if (patch.clientId === undefined) return { ...project, ...patch };
  if (patch.clientId === null || patch.clientId === "") {
    const next = { ...project, ...patch };
    delete (next as { clientId?: string | null }).clientId;
    return next;
  }
  return { ...project, ...patch, clientId: patch.clientId };
}

export type ResolveProjectClientInput = {
  /** Currently linked client id on the project (if any). */
  linkedClientId?: string | null;
  /** Edited client name from the project form. Empty → unassign. */
  clientName: string;
  clients: Client[];
};

export type ResolveProjectClientPlan =
  | { action: "clear" }
  | { action: "keep"; clientId: string }
  | { action: "rename"; clientId: string; name: string }
  | { action: "assignExisting"; clientId: string }
  | { action: "create"; name: string };

/**
 * Plan how a project’s client name field maps to store actions.
 * Edits the linked client’s name in place — no multi-client picker.
 */
export function planProjectClientLink(
  input: ResolveProjectClientInput
): ResolveProjectClientPlan {
  const name = input.clientName.trim();
  if (!name) return { action: "clear" };

  const linkedId = input.linkedClientId || undefined;
  const linked = linkedId
    ? input.clients.find((c) => c.id === linkedId)
    : undefined;
  const existing = findClientByNormalizedName(input.clients, name);

  if (linked) {
    if (normalizeClientName(linked.name) === normalizeClientName(name)) {
      if (linked.name === name) return { action: "keep", clientId: linked.id };
      return { action: "rename", clientId: linked.id, name };
    }
    // Typed a different existing client’s name → re-link (dedupe), don’t fork names.
    if (existing && existing.id !== linked.id) {
      return { action: "assignExisting", clientId: existing.id };
    }
    return { action: "rename", clientId: linked.id, name };
  }

  if (existing) return { action: "assignExisting", clientId: existing.id };
  return { action: "create", name };
}
