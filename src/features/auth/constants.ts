import type { UserRole } from "./types";

export const PIN_LENGTH = 6;
export const MAX_FAILED_ATTEMPTS = 3;
export const LOCKOUT_SECONDS = 30;
export const LOCKOUT_MS = LOCKOUT_SECONDS * 1000;
export const EPHEMERAL_TIMEOUT_MS = 300_000;
export const PIN_SALT_BYTES = 16;
export const LOCKOUT_TICK_MS = 500;
export const DISPLAY_NAME_MAX_LENGTH = 48;
export const PROFILE_ID_PAD_LENGTH = 2;
export const UNKNOWN_BADGE_BYTES = 8;

export const AUTH_PROFILES_STORAGE_KEY = "orbita_auth_profiles_v1";
export const HISTORY_STORAGE_PREFIX = "orbita_history_";

export const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  astronaut: "Astronaut",
  ground_operator: "Ground Operator",
};
