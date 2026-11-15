import {
  AUTH_PROFILES_STORAGE_KEY,
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  PIN_LENGTH,
  PROFILE_ID_PAD_LENGTH,
} from "./constants";
import { hashPin, isValidPin, randomSalt, verifyPinHash } from "./pinCrypto";
import { historyStorageKey } from "./profileHistory";
import { cloneSeedProfiles } from "./seed";
import type {
  AuthProfile,
  AuthStoreOptions,
  EnrollmentInput,
  StorageLike,
  UserRole,
  VerifyPinResult,
} from "./types";

export { LOCKOUT_MS, LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS, PIN_LENGTH } from "./constants";

export type AuthErrorCode =
  | "invalid_pin_format"
  | "credential_exists"
  | "profile_exists";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export interface AuthStore {
  getProfiles(): AuthProfile[];
  getProfile(credentialId: string): AuthProfile | undefined;
  getProfileById(profileId: string): AuthProfile | undefined;
  forgetProfile(profileId: string): void;
  resetDemoProfiles(): void;
  verifyPin(credentialId: string, pin: string, now?: number): Promise<VerifyPinResult>;
  enroll(input: EnrollmentInput, now?: number): Promise<AuthProfile>;
  getLockoutRemainingMs(credentialId: string, now?: number): number;
  getFailedAttempts(credentialId: string): number;
  registerFailedAttempt(credentialId: string, now?: number): number;
  clearAttempts(credentialId: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredProfile(value: unknown): value is AuthProfile {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.profile_id === "string" &&
    typeof value.display_name === "string" &&
    (value.role === "astronaut" || value.role === "ground_operator") &&
    typeof value.credential_id === "string" &&
    typeof value.pin_hash === "string" &&
    typeof value.salt === "string" &&
    (value.history_seed === "synthetic" || value.history_seed === "empty") &&
    (value.side === "space" || value.side === "earth") &&
    typeof value.created_at === "string"
  );
}

function resolveStorage(options: AuthStoreOptions): StorageLike | null {
  if (options.storage !== undefined) {
    return options.storage;
  }
  if (typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage;
  }
  return null;
}

function readStoredProfiles(storage: StorageLike | null): AuthProfile[] | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(AUTH_PROFILES_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredProfile) : null;
  } catch {
    return null;
  }
}

function profilePrefix(role: UserRole): string {
  return role === "astronaut" ? "astro" : "ground";
}

export function createAuthStore(options: AuthStoreOptions = {}): AuthStore {
  const storage = resolveStorage(options);
  const now = options.now ?? (() => Date.now());
  const profiles = new Map<string, AuthProfile>();
  const failedAttempts = new Map<string, number>();
  const lockoutUntil = new Map<string, number>();

  const storedProfiles = readStoredProfiles(storage);
  for (const profile of storedProfiles ?? cloneSeedProfiles()) {
    profiles.set(profile.profile_id, profile);
  }

  function persist(): void {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(
        AUTH_PROFILES_STORAGE_KEY,
        JSON.stringify(Array.from(profiles.values())),
      );
    } catch {
      // Storage may be unavailable in hardened/private webview contexts.
    }
  }

  function getProfiles(): AuthProfile[] {
    return Array.from(profiles.values()).map((profile) => ({ ...profile }));
  }

  function getProfile(credentialId: string): AuthProfile | undefined {
    const found = Array.from(profiles.values()).find(
      (profile) => profile.credential_id === credentialId,
    );
    return found ? { ...found } : undefined;
  }

  function getProfileById(profileId: string): AuthProfile | undefined {
    const found = profiles.get(profileId);
    return found ? { ...found } : undefined;
  }

  function forgetProfile(profileId: string): void {
    const profile = profiles.get(profileId);
    if (!profile) {
      return;
    }

    const remainingProfiles = Array.from(profiles.values()).filter(
      (savedProfile) => savedProfile.profile_id !== profileId,
    );
    if (storage) {
      storage.setItem(AUTH_PROFILES_STORAGE_KEY, JSON.stringify(remainingProfiles));
    }

    profiles.delete(profileId);
    clearAttempts(profile.credential_id);
  }

  function resetDemoProfiles(): void {
    const demoProfiles = cloneSeedProfiles();
    if (storage) {
      storage.setItem(AUTH_PROFILES_STORAGE_KEY, JSON.stringify(demoProfiles));
    }
    profiles.clear();
    failedAttempts.clear();
    lockoutUntil.clear();
    for (const profile of demoProfiles) {
      profiles.set(profile.profile_id, profile);
    }
  }

  function getLockoutRemainingMs(credentialId: string, at: number = now()): number {
    const until = lockoutUntil.get(credentialId);
    if (until === undefined) {
      return 0;
    }
    const remaining = until - at;
    if (remaining <= 0) {
      lockoutUntil.delete(credentialId);
      return 0;
    }
    return remaining;
  }

  function registerFailedAttempt(credentialId: string, at: number = now()): number {
    const count = (failedAttempts.get(credentialId) ?? 0) + 1;
    if (count >= MAX_FAILED_ATTEMPTS) {
      failedAttempts.set(credentialId, 0);
      lockoutUntil.set(credentialId, at + LOCKOUT_MS);
      return LOCKOUT_MS;
    }
    failedAttempts.set(credentialId, count);
    return 0;
  }

  function clearAttempts(credentialId: string): void {
    failedAttempts.delete(credentialId);
    lockoutUntil.delete(credentialId);
  }

  async function verifyPin(
    credentialId: string,
    pin: string,
    at: number = now(),
  ): Promise<VerifyPinResult> {
    const profile = getProfile(credentialId);
    if (!profile) {
      return { ok: false, reason: "unknown_credential", remainingMs: 0 };
    }

    const remaining = getLockoutRemainingMs(credentialId, at);
    if (remaining > 0) {
      return { ok: false, reason: "locked", remainingMs: remaining };
    }

    if (!isValidPin(pin)) {
      return { ok: false, reason: "invalid_format", remainingMs: 0 };
    }

    const matches = await verifyPinHash(pin, profile.salt, profile.pin_hash);
    if (matches) {
      clearAttempts(credentialId);
      return { ok: true, profile, remainingMs: 0 };
    }

    const lockoutRemaining = registerFailedAttempt(credentialId, at);
    if (lockoutRemaining > 0) {
      return { ok: false, reason: "locked", remainingMs: lockoutRemaining };
    }

    return { ok: false, reason: "invalid_pin", remainingMs: 0 };
  }

  function nextProfileId(role: UserRole): string {
    const prefix = profilePrefix(role);
    let index = 1;
    while (true) {
      const profileId = `${prefix}-${String(index).padStart(PROFILE_ID_PAD_LENGTH, "0")}`;
      const hasHistory = storage !== null && storage.getItem(historyStorageKey(profileId)) !== null;
      if (!profiles.has(profileId) && !hasHistory) {
        return profileId;
      }
      index += 1;
    }
  }

  async function enroll(input: EnrollmentInput, at: number = now()): Promise<AuthProfile> {
    if (!isValidPin(input.pin)) {
      throw new AuthError(
        "invalid_pin_format",
        `PIN must contain exactly ${PIN_LENGTH} digits.`,
      );
    }
    if (getProfile(input.credential_id)) {
      throw new AuthError("credential_exists", "This badge is already registered.");
    }

    const role: UserRole = input.role === "ground_operator" ? "ground_operator" : "astronaut";
    const profileId = nextProfileId(role);
    const salt = randomSalt();
    const pinHash = await hashPin(input.pin, salt);
    const suffix = profileId.split("-")[1];
    const displayName = input.display_name?.trim() || `Crew Member ${suffix}`;

    const profile: AuthProfile = {
      profile_id: profileId,
      display_name: displayName,
      role,
      credential_id: input.credential_id,
      pin_hash: pinHash,
      salt,
      history_seed: "empty",
      side: role === "ground_operator" ? "earth" : "space",
      created_at: new Date(at).toISOString(),
    };

    profiles.set(profileId, profile);
    persist();
    return { ...profile };
  }

  return {
    getProfiles,
    getProfile,
    getProfileById,
    forgetProfile,
    resetDemoProfiles,
    verifyPin,
    enroll,
    getLockoutRemainingMs,
    getFailedAttempts: (credentialId) => failedAttempts.get(credentialId) ?? 0,
    registerFailedAttempt,
    clearAttempts,
  };
}

export const authStorageKey = AUTH_PROFILES_STORAGE_KEY;
