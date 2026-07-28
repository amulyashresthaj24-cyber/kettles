import { describe, expect, it } from "vitest";
import type { Client, Project } from "./types";
import {
  applyProjectClientPatch,
  findClientByNormalizedName,
  getProjectClient,
  getProjectClientName,
  normalizeClientName,
  planProjectClientLink,
  toProjectClientId,
} from "./clients";

const clients: Client[] = [
  { id: "c1", name: "Acme Corp", hourlyRate: 100 },
  { id: "c2", name: "Beta LLC", hourlyRate: 80 },
];

function project(partial: Partial<Project> & { id: string; name: string }): Project {
  return {
    color: "blue",
    billable: true,
    ...partial,
  };
}

describe("normalizeClientName", () => {
  it("trims and lowercases", () => {
    expect(normalizeClientName("  Acme Corp ")).toBe("acme corp");
  });
});

describe("findClientByNormalizedName", () => {
  it("matches case-insensitively and ignores surrounding space", () => {
    expect(findClientByNormalizedName(clients, "  acme corp")?.id).toBe("c1");
    expect(findClientByNormalizedName(clients, "ACME CORP")?.id).toBe("c1");
  });

  it("returns undefined when no match", () => {
    expect(findClientByNormalizedName(clients, "Gamma")).toBeUndefined();
  });

  it("returns undefined for blank names", () => {
    expect(findClientByNormalizedName(clients, "   ")).toBeUndefined();
  });
});

describe("getProjectClient — single assigned client only", () => {
  it("returns the assigned client", () => {
    const p = project({ id: "p1", name: "Site", clientId: "c2" });
    expect(getProjectClient(p, clients)?.name).toBe("Beta LLC");
  });

  it("returns undefined for unassigned projects", () => {
    const p = project({ id: "p2", name: "Internal" });
    expect(getProjectClient(p, clients)).toBeUndefined();
  });

  it("returns undefined when clientId is null", () => {
    const p = project({ id: "p3", name: "Cleared", clientId: null });
    expect(getProjectClient(p, clients)).toBeUndefined();
  });

  it("does not leak unrelated clients", () => {
    const p = project({ id: "p4", name: "One", clientId: "c1" });
    const resolved = getProjectClient(p, clients);
    expect(resolved?.id).toBe("c1");
    expect(resolved?.id).not.toBe("c2");
  });
});

describe("assign / switch / unassign client on project", () => {
  it("assigns an existing client", () => {
    const p = project({ id: "p1", name: "A" });
    const next = applyProjectClientPatch(p, { clientId: "c1" });
    expect(next.clientId).toBe("c1");
    expect(getProjectClient(next, clients)?.name).toBe("Acme Corp");
  });

  it("switches clients without affecting the previous assignment shape", () => {
    const p = project({ id: "p1", name: "A", clientId: "c1" });
    const next = applyProjectClientPatch(p, { clientId: "c2" });
    expect(next.clientId).toBe("c2");
    expect(getProjectClient(next, clients)?.id).toBe("c2");
  });

  it("clears client on explicit null (No client)", () => {
    const p = project({ id: "p1", name: "A", clientId: "c1" });
    const next = applyProjectClientPatch(p, { clientId: null });
    expect(next.clientId).toBeUndefined();
    expect(getProjectClient(next, clients)).toBeUndefined();
  });

  it("clears client on empty string", () => {
    const p = project({ id: "p1", name: "A", clientId: "c1" });
    const next = applyProjectClientPatch(p, { clientId: "" as unknown as null });
    expect(next.clientId).toBeUndefined();
  });

  it("leaves client untouched when patch omits clientId", () => {
    const p = project({ id: "p1", name: "A", clientId: "c1" });
    const next = applyProjectClientPatch(p, {});
    expect(next.clientId).toBe("c1");
  });
});

describe("toProjectClientId", () => {
  it("maps empty to null for clear-on-save", () => {
    expect(toProjectClientId("")).toBe(null);
    expect(toProjectClientId(null)).toBe(null);
  });

  it("keeps valid ids", () => {
    expect(toProjectClientId("c1")).toBe("c1");
  });

  it("preserves undefined (no change)", () => {
    expect(toProjectClientId(undefined)).toBeUndefined();
  });
});

describe("inline create → assign flow (dedupe)", () => {
  it("selects existing client instead of creating a duplicate", () => {
    const attemptedName = "  ACME corp ";
    const existing = findClientByNormalizedName(clients, attemptedName);
    expect(existing).toBeDefined();
    // Store addClient returns existing; UI assigns that id.
    const p = applyProjectClientPatch(
      project({ id: "p1", name: "Work" }),
      { clientId: existing!.id }
    );
    expect(p.clientId).toBe("c1");
    expect(clients.filter((c) => normalizeClientName(c.name) === "acme corp")).toHaveLength(1);
  });

  it("would create when name is new", () => {
    expect(findClientByNormalizedName(clients, "New Co")).toBeUndefined();
  });
});

describe("reassignment isolation", () => {
  it("changing one project client does not mutate another project object", () => {
    const a = project({ id: "a", name: "A", clientId: "c1" });
    const b = project({ id: "b", name: "B", clientId: "c1" });
    const aNext = applyProjectClientPatch(a, { clientId: "c2" });
    expect(aNext.clientId).toBe("c2");
    expect(b.clientId).toBe("c1");
  });
});

describe("planProjectClientLink — name field, not dropdown", () => {
  it("clears when name is empty", () => {
    expect(
      planProjectClientLink({ linkedClientId: "c1", clientName: "  ", clients })
    ).toEqual({ action: "clear" });
  });

  it("renames the linked client in place", () => {
    expect(
      planProjectClientLink({
        linkedClientId: "c1",
        clientName: "Acme International",
        clients,
      })
    ).toEqual({ action: "rename", clientId: "c1", name: "Acme International" });
  });

  it("keeps link when name is unchanged", () => {
    expect(
      planProjectClientLink({
        linkedClientId: "c1",
        clientName: "Acme Corp",
        clients,
      })
    ).toEqual({ action: "keep", clientId: "c1" });
  });

  it("trims casing-only renames on linked client", () => {
    expect(
      planProjectClientLink({
        linkedClientId: "c1",
        clientName: "acme corp",
        clients,
      })
    ).toEqual({ action: "rename", clientId: "c1", name: "acme corp" });
  });

  it("assigns existing by typed name when unlinked (dedupe)", () => {
    expect(
      planProjectClientLink({
        linkedClientId: null,
        clientName: "  beta llc ",
        clients,
      })
    ).toEqual({ action: "assignExisting", clientId: "c2" });
  });

  it("creates when unlinked and name is new", () => {
    expect(
      planProjectClientLink({
        linkedClientId: null,
        clientName: "New Co",
        clients,
      })
    ).toEqual({ action: "create", name: "New Co" });
  });

  it("relinks to existing when typed name matches another client", () => {
    expect(
      planProjectClientLink({
        linkedClientId: "c1",
        clientName: "Beta LLC",
        clients,
      })
    ).toEqual({ action: "assignExisting", clientId: "c2" });
  });

  it("getProjectClientName returns only the linked name", () => {
    expect(getProjectClientName({ clientId: "c1" }, clients)).toBe("Acme Corp");
    expect(getProjectClientName({ clientId: null }, clients)).toBe("");
    expect(getProjectClientName({}, clients)).toBe("");
  });
});
