export type UserRole = "astronaut" | "ground_operator";

export type SessionMode = "ephemeral" | "persistent";

export type HistorySeed = "synthetic" | "empty";

export interface AuthProfile {
  profile_id: string;
  display_name: string;
  role: UserRole;
  credential_id: string;
  pin_hash: string;
  salt: string;
  history_seed: HistorySeed;
  side: "space" | "earth";
  created_at: string;
}

export interface AuthSession {
  profile_id: string;
  session_mode: SessionMode;
  started_at: number;
}

export interface VerifyPinResult {
  ok: boolean;
  profile?: AuthProfile;
  reason?: "unknown_credential" | "invalid_pin" | "locked" | "invalid_format";
  remainingMs: number;
}

export interface EnrollmentInput {
  credential_id: string;
  pin: string;
  display_name?: string;
  role?: UserRole;
}

export interface AuthStoreOptions {
  storage?: StorageLike | null;
  now?: () => number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
