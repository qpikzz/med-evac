import type { AuthSession, SessionMode, UserRole } from "./types";

export function landingViewForRole(role: UserRole): "main" | "comms" {
  return role === "ground_operator" ? "comms" : "main";
}

export function landingChannelForRole(role: UserRole): "local" | "earth" {
  return role === "ground_operator" ? "earth" : "local";
}

export function createSession(
  profileId: string,
  mode: SessionMode,
  startedAt: number = Date.now(),
): AuthSession {
  return {
    profile_id: profileId,
    session_mode: mode,
    started_at: startedAt,
  };
}

export function shouldUseInactivityWatchdog(mode: SessionMode): boolean {
  return mode === "ephemeral";
}
