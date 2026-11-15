import { describe, expect, it } from "vitest";
import { migrateLegacyStorageKeys } from "./migrateBrandKeys";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("migrateLegacyStorageKeys", () => {
  it("moves legacy med_evac_* keys to orbita_* and deletes the originals", () => {
    const storage = new MemoryStorage();
    storage.setItem("med_evac_auth_profiles_v1", "profiles");
    storage.setItem("med_evac_history_astro-01", "history");

    const result = migrateLegacyStorageKeys(storage);

    expect(result.migrated).toEqual([
      "orbita_auth_profiles_v1",
      "orbita_history_astro-01",
    ]);
    expect(storage.getItem("orbita_auth_profiles_v1")).toBe("profiles");
    expect(storage.getItem("orbita_history_astro-01")).toBe("history");
    expect(storage.getItem("med_evac_auth_profiles_v1")).toBeNull();
    expect(storage.getItem("med_evac_history_astro-01")).toBeNull();
  });

  it("keeps an existing orbita_* value and still removes the legacy key", () => {
    const storage = new MemoryStorage();
    storage.setItem("med_evac_auth_profiles_v1", "old");
    storage.setItem("orbita_auth_profiles_v1", "current");

    const result = migrateLegacyStorageKeys(storage);

    expect(result.migrated).toEqual([]);
    expect(storage.getItem("orbita_auth_profiles_v1")).toBe("current");
    expect(storage.getItem("med_evac_auth_profiles_v1")).toBeNull();
  });

  it("ignores unrelated keys and tolerates absent storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "value");

    expect(migrateLegacyStorageKeys(storage).migrated).toEqual([]);
    expect(storage.getItem("unrelated")).toBe("value");
    expect(migrateLegacyStorageKeys(null).migrated).toEqual([]);
  });
});
