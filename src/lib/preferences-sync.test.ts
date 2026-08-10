/**
 * Wave 1.2 preference-sync: setPreferences merge/stamp, debounced push,
 * flushPreferences success/conflict/error, loadProfile last-write-wins.
 *
 * Tests the real store (useApp). supabase is mocked so no env/network is needed.
 * localStorage is stubbed for zustand persist under vitest's node environment.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPreferences, UserProfile } from "./types";

// ---------------------------------------------------------------------------
// Environment stubs (must run before store import via vi.hoisted)
// ---------------------------------------------------------------------------

const { profileGet, profileUpsert, memoryStorage } = vi.hoisted(() => {
  const map = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };

  // zustand persist reads localStorage; vitest node has none by default.
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    writable: true,
    configurable: true,
  });

  return {
    profileGet: vi.fn(),
    profileUpsert: vi.fn(),
    memoryStorage,
  };
});

vi.mock("./supabase", () => ({
  api: {
    profile: {
      get: (...args: unknown[]) => profileGet(...args),
      upsert: (...args: unknown[]) => profileUpsert(...args),
    },
  },
}));

// Import after mock + localStorage stub.
// Import the real defaults rather than restating them. A hand-copied duplicate
// is what let alarmSound silently drop out of setPreferences in the first place.
import { DEFAULT_PREFERENCES, useApp } from "./store-supabase";

/** Debounce window in store-supabase (not exported). */
const PREFERENCES_PUSH_DELAY = 800;

function makeProfile(partial: Partial<UserProfile> & { userId?: string } = {}): UserProfile {
  return {
    userId: partial.userId ?? "user-1",
    onboardingCompleted: partial.onboardingCompleted ?? true,
    fullName: partial.fullName,
    avatarUrl: partial.avatarUrl,
    preferences: partial.preferences,
    preferencesUpdatedAt: partial.preferencesUpdatedAt,
    onboardingCompletedAt: partial.onboardingCompletedAt,
  };
}

function resetPreferenceState(overrides: {
  preferences?: UserPreferences;
  preferencesUpdatedAt?: number;
  preferencesDirty?: boolean;
} = {}) {
  memoryStorage.clear();
  useApp.setState({
    preferences: { ...(overrides.preferences ?? DEFAULT_PREFERENCES) },
    preferencesUpdatedAt: overrides.preferencesUpdatedAt,
    preferencesDirty: overrides.preferencesDirty ?? false,
    profile: null,
    profileLoaded: false,
  });
}

describe("preference-sync (Wave 1.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      // Keep real Date.now so successive setPreferences get distinct stamps.
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });
    profileGet.mockReset();
    profileUpsert.mockReset();
    profileUpsert.mockResolvedValue(makeProfile());
    profileGet.mockResolvedValue(null);
    resetPreferenceState();
  });

  afterEach(() => {
    // Drain any scheduled preference push so it cannot leak into the next test.
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("setPreferences", () => {
    it("merges over defaults and preserves keys the caller did not pass (alarmSound)", () => {
      // Baseline includes alarmSound: "kettle". Changing another field must not drop it.
      expect(useApp.getState().preferences?.alarmSound).toBe("kettle");

      useApp.getState().setPreferences({ weeklyTargetHours: 25 });

      const prefs = useApp.getState().preferences!;
      expect(prefs.weeklyTargetHours).toBe(25);
      expect(prefs.alarmSound).toBe("kettle");
      expect(prefs.whistleSoundEnabled).toBe(true);
      expect(prefs.defaultFocusDuration).toBe(0);
    });

    it("preserves a previously set alarmSound when another field is patched", () => {
      useApp.getState().setPreferences({ alarmSound: "chime" });
      useApp.getState().setPreferences({ weeklyTargetHours: 12 });

      expect(useApp.getState().preferences?.alarmSound).toBe("chime");
      expect(useApp.getState().preferences?.weeklyTargetHours).toBe(12);
    });

    it("stamps preferencesUpdatedAt and sets preferencesDirty true", () => {
      const before = Date.now();
      expect(useApp.getState().preferencesDirty).toBe(false);
      expect(useApp.getState().preferencesUpdatedAt).toBeUndefined();

      useApp.getState().setPreferences({ autoBreakEnabled: true });

      const { preferencesDirty, preferencesUpdatedAt, preferences } = useApp.getState();
      expect(preferencesDirty).toBe(true);
      expect(typeof preferencesUpdatedAt).toBe("number");
      expect(preferencesUpdatedAt!).toBeGreaterThanOrEqual(before);
      expect(preferencesUpdatedAt!).toBeLessThanOrEqual(Date.now());
      expect(preferences?.autoBreakEnabled).toBe(true);
    });
  });

  describe("debounced push", () => {
    it("coalesces rapid setPreferences into one api.profile.upsert", async () => {
      useApp.getState().setPreferences({ weeklyTargetHours: 1 });
      useApp.getState().setPreferences({ weeklyTargetHours: 2 });
      useApp.getState().setPreferences({ weeklyTargetHours: 3 });

      expect(profileUpsert).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(PREFERENCES_PUSH_DELAY);

      expect(profileUpsert).toHaveBeenCalledTimes(1);
      const payload = profileUpsert.mock.calls[0][0] as {
        preferences: UserPreferences;
        preferencesUpdatedAt: number;
      };
      expect(payload.preferences.weeklyTargetHours).toBe(3);
      expect(typeof payload.preferencesUpdatedAt).toBe("number");
    });
  });

  describe("flushPreferences", () => {
    it("is a no-op when preferencesDirty is false", async () => {
      resetPreferenceState({ preferencesDirty: false });
      await useApp.getState().flushPreferences();
      expect(profileUpsert).not.toHaveBeenCalled();
    });

    it("clears preferencesDirty on success when no newer edit landed", async () => {
      useApp.getState().setPreferences({ weeklyTargetHours: 18 });
      expect(useApp.getState().preferencesDirty).toBe(true);

      const stamp = useApp.getState().preferencesUpdatedAt!;
      profileUpsert.mockResolvedValue(
        makeProfile({
          preferences: useApp.getState().preferences,
          preferencesUpdatedAt: stamp,
        })
      );

      await useApp.getState().flushPreferences();

      expect(profileUpsert).toHaveBeenCalledTimes(1);
      expect(useApp.getState().preferencesDirty).toBe(false);
      expect(useApp.getState().profileLoaded).toBe(true);
    });

    it("leaves preferencesDirty true when a newer local edit landed while the request was in flight", async () => {
      useApp.getState().setPreferences({ weeklyTargetHours: 10 });
      const firstStamp = useApp.getState().preferencesUpdatedAt!;

      let resolveUpsert!: (value: UserProfile) => void;
      profileUpsert.mockImplementation(
        () =>
          new Promise<UserProfile>((resolve) => {
            resolveUpsert = resolve;
          })
      );

      const flushPromise = useApp.getState().flushPreferences();

      // Newer local edit while the first upsert is still pending.
      useApp.getState().setPreferences({ weeklyTargetHours: 20 });
      const secondStamp = useApp.getState().preferencesUpdatedAt!;
      expect(secondStamp).toBeGreaterThan(firstStamp);

      resolveUpsert(
        makeProfile({
          preferences: { ...DEFAULT_PREFERENCES, weeklyTargetHours: 10 },
          preferencesUpdatedAt: firstStamp,
        })
      );
      await flushPromise;

      // Stamp comparison: local stamp > stamp captured at flush start → stay dirty.
      expect(useApp.getState().preferencesDirty).toBe(true);
      expect(useApp.getState().preferences?.weeklyTargetHours).toBe(20);
    });

    it("leaves preferencesDirty true when upsert rejects, and does not throw", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      useApp.getState().setPreferences({ weeklyTargetHours: 7 });
      profileUpsert.mockRejectedValue(new Error("network down"));

      await expect(useApp.getState().flushPreferences()).resolves.toBeUndefined();

      expect(useApp.getState().preferencesDirty).toBe(true);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe("loadProfile reconcile", () => {
    it("overwrites local when remote is strictly newer", async () => {
      resetPreferenceState({
        preferences: { ...DEFAULT_PREFERENCES, weeklyTargetHours: 10, alarmSound: "local-only" },
        preferencesUpdatedAt: 1_000,
        preferencesDirty: false,
      });

      profileGet.mockResolvedValue(
        makeProfile({
          preferences: { weeklyTargetHours: 50 },
          preferencesUpdatedAt: 2_000,
        })
      );

      await useApp.getState().loadProfile();

      expect(useApp.getState().preferences?.weeklyTargetHours).toBe(50);
      // Partial remote merges over defaults — alarmSound falls back to default, not local-only.
      expect(useApp.getState().preferences?.alarmSound).toBe("kettle");
      expect(useApp.getState().preferencesUpdatedAt).toBe(2_000);
      expect(useApp.getState().preferencesDirty).toBe(false);
      expect(profileUpsert).not.toHaveBeenCalled();
    });

    it("merges a partial remote preferences object over DEFAULT_PREFERENCES", async () => {
      resetPreferenceState({
        preferences: { ...DEFAULT_PREFERENCES },
        preferencesUpdatedAt: 0,
        preferencesDirty: false,
      });

      // Older rows lack newer keys (e.g. alarmSound, mascot fields).
      profileGet.mockResolvedValue(
        makeProfile({
          preferences: { weeklyTargetHours: 33 },
          preferencesUpdatedAt: 9_999,
        })
      );

      await useApp.getState().loadProfile();

      const prefs = useApp.getState().preferences!;
      expect(prefs.weeklyTargetHours).toBe(33);
      expect(prefs.alarmSound).toBe("kettle");
      expect(prefs.activeMascot).toBe("kettle");
      expect(prefs.mascotAnimationFrequency).toBe("normal");
      expect(prefs.whistleSoundEnabled).toBe(true);
      expect(prefs.autoPauseOnIdleEnabled).toBe(true);
    });

    it("keeps local and triggers a push when local is newer than remote", async () => {
      resetPreferenceState({
        preferences: { ...DEFAULT_PREFERENCES, weeklyTargetHours: 99 },
        preferencesUpdatedAt: 5_000,
        preferencesDirty: true,
      });

      profileGet.mockResolvedValue(
        makeProfile({
          preferences: { weeklyTargetHours: 1 },
          preferencesUpdatedAt: 1_000,
        })
      );
      profileUpsert.mockResolvedValue(
        makeProfile({
          preferences: { ...DEFAULT_PREFERENCES, weeklyTargetHours: 99 },
          preferencesUpdatedAt: 5_000,
        })
      );

      await useApp.getState().loadProfile();

      // Local must not be overwritten by the older remote.
      expect(useApp.getState().preferences?.weeklyTargetHours).toBe(99);

      // loadProfile fires flushPreferences without awaiting; flush the microtask/timer chain.
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();

      expect(profileUpsert).toHaveBeenCalled();
      const payload = profileUpsert.mock.calls[0][0] as {
        preferences: UserPreferences;
        preferencesUpdatedAt: number;
      };
      expect(payload.preferences.weeklyTargetHours).toBe(99);
      expect(payload.preferencesUpdatedAt).toBe(5_000);
    });

    it("does not overwrite local when timestamps are equal", async () => {
      resetPreferenceState({
        preferences: {
          ...DEFAULT_PREFERENCES,
          weeklyTargetHours: 42,
          alarmSound: "custom-local",
        },
        preferencesUpdatedAt: 7_000,
        preferencesDirty: false,
      });

      profileGet.mockResolvedValue(
        makeProfile({
          preferences: { weeklyTargetHours: 1, alarmSound: "remote-sound" },
          preferencesUpdatedAt: 7_000,
        })
      );

      await useApp.getState().loadProfile();

      expect(useApp.getState().preferences?.weeklyTargetHours).toBe(42);
      expect(useApp.getState().preferences?.alarmSound).toBe("custom-local");
      expect(useApp.getState().preferencesUpdatedAt).toBe(7_000);
      expect(profileUpsert).not.toHaveBeenCalled();
    });
  });
});
