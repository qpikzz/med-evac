const LEGACY_PREFIX = "med_evac_";
const CURRENT_PREFIX = "orbita_";

type MigratableStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export interface MigrationResult {
  migrated: string[];
}

function resolveStorage(): MigratableStorage | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }
  return globalThis.localStorage;
}

export function migrateLegacyStorageKeys(
  storage: MigratableStorage | null = resolveStorage(),
): MigrationResult {
  const migrated: string[] = [];
  if (!storage) {
    return { migrated };
  }

  const legacyKeys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null && key.startsWith(LEGACY_PREFIX)) {
        legacyKeys.push(key);
      }
    }
  } catch {
    return { migrated };
  }

  for (const legacyKey of legacyKeys) {
    const currentKey = `${CURRENT_PREFIX}${legacyKey.slice(LEGACY_PREFIX.length)}`;
    try {
      const value = storage.getItem(legacyKey);
      if (value === null) {
        continue;
      }
      if (storage.getItem(currentKey) === null) {
        storage.setItem(currentKey, value);
        migrated.push(currentKey);
      }
      storage.removeItem(legacyKey);
    } catch {
      // Best-effort migration for restricted webview storage contexts.
    }
  }

  return { migrated };
}
