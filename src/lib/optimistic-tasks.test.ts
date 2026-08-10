import { describe, it, expect, vi } from "vitest";
import { optimisticTasks } from "./store-supabase";
import type { Task } from "./types";

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    status: "todo",
    urgency: "normal",
    createdAt: 1,
    ...patch,
  } as Task;
}

/** Minimal stand-in for the slice of the store the helper touches. */
function harness(initial: Task[]) {
  let tasks = initial;
  return {
    get: () => ({ tasks }),
    set: (partial: { tasks: Task[] }) => {
      tasks = partial.tasks;
    },
    current: () => tasks,
  };
}

describe("optimisticTasks", () => {
  it("applies the local change before the server call resolves", async () => {
    const h = harness([task("a"), task("b")]);
    const seenDuringCall: string[] = [];

    await optimisticTasks(
      h.set,
      h.get,
      (tasks) => tasks.map((t) => (t.id === "a" ? { ...t, status: "done" } : t)),
      async () => {
        // The UI renders from this state while the request is in flight.
        seenDuringCall.push(h.current().find((t) => t.id === "a")!.status);
        return { ok: true };
      }
    );

    expect(seenDuringCall).toEqual(["done"]);
    expect(h.current().find((t) => t.id === "a")!.status).toBe("done");
  });

  it("restores the previous list when the server call rejects", async () => {
    const h = harness([task("a"), task("b")]);

    await expect(
      optimisticTasks(
        h.set,
        h.get,
        (tasks) => tasks.map((t) => (t.id === "a" ? { ...t, status: "done" } : t)),
        async () => {
          throw new Error("network down");
        }
      )
    ).rejects.toThrow("network down");

    // Rolled all the way back, not left half-applied.
    expect(h.current().find((t) => t.id === "a")!.status).toBe("todo");
    expect(h.current()).toHaveLength(2);
  });

  it("rolls back a removal without dropping other rows", async () => {
    const h = harness([task("a"), task("b"), task("c")]);

    await expect(
      optimisticTasks(
        h.set,
        h.get,
        (tasks) => tasks.filter((t) => t.id !== "b"),
        async () => {
          throw new Error("boom");
        }
      )
    ).rejects.toThrow("boom");

    expect(h.current().map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("returns the server result so callers can merge the canonical row", async () => {
    const h = harness([task("a")]);

    const result = await optimisticTasks(
      h.set,
      h.get,
      (tasks) => tasks,
      async () => ({ id: "a", title: "renamed by server" })
    );

    expect(result).toEqual({ id: "a", title: "renamed by server" });
  });

  it("does not mutate the snapshot array it rolls back to", async () => {
    const initial = [task("a")];
    const h = harness(initial);

    await expect(
      optimisticTasks(
        h.set,
        h.get,
        (tasks) => [...tasks, task("new")],
        async () => {
          throw new Error("nope");
        }
      )
    ).rejects.toThrow();

    expect(initial).toHaveLength(1);
    expect(h.current()).toBe(initial);
  });

  it("rolls back to the state at call time, not to an empty list", async () => {
    const h = harness([]);
    const spy = vi.fn(async () => {
      throw new Error("fail");
    });

    await expect(
      optimisticTasks(h.set, h.get, (tasks) => [...tasks, task("x")], spy)
    ).rejects.toThrow();

    expect(h.current()).toEqual([]);
    expect(spy).toHaveBeenCalledOnce();
  });
});
