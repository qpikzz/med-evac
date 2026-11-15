import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createAuthStore } from "./authStore";
import { ACTIVITY_EVENTS, EPHEMERAL_TIMEOUT_MS } from "./constants";
import { createSession, shouldUseInactivityWatchdog } from "./session";
import { createInactivityTimer } from "./sessionTimer";
import type {
  AuthProfile,
  AuthSession,
  EnrollmentInput,
  SessionMode,
  VerifyPinResult,
} from "./types";

interface AuthContextValue {
  profiles: AuthProfile[];
  activeSession: AuthSession | null;
  activeProfile: AuthProfile | null;
  verifyPin: (credentialId: string, pin: string) => Promise<VerifyPinResult>;
  enroll: (input: EnrollmentInput) => Promise<AuthProfile>;
  startSession: (profileId: string, mode: SessionMode) => void;
  logout: () => void;
  refreshProfiles: () => void;
  getLockoutRemainingMs: (credentialId: string) => number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [store] = useState(() => createAuthStore());
  const [profiles, setProfiles] = useState<AuthProfile[]>(() => store.getProfiles());
  const [activeSession, setActiveSession] = useState<AuthSession | null>(null);

  const refreshProfiles = useCallback(() => {
    setProfiles(store.getProfiles());
  }, [store]);

  const logout = useCallback(() => {
    setActiveSession(null);
  }, []);

  const verifyPin = useCallback(
    (credentialId: string, pin: string) => store.verifyPin(credentialId, pin),
    [store],
  );

  const enroll = useCallback(
    async (input: EnrollmentInput) => {
      const profile = await store.enroll(input);
      refreshProfiles();
      return profile;
    },
    [refreshProfiles, store],
  );

  const startSession = useCallback((profileId: string, mode: SessionMode) => {
    setActiveSession(createSession(profileId, mode));
  }, []);

  const getLockoutRemainingMs = useCallback(
    (credentialId: string) => store.getLockoutRemainingMs(credentialId),
    [store],
  );

  useEffect(() => {
    if (!activeSession || !shouldUseInactivityWatchdog(activeSession.session_mode)) {
      return;
    }
    const timer = createInactivityTimer(() => setActiveSession(null), EPHEMERAL_TIMEOUT_MS);
    const onActivity = () => timer.poke();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    timer.start();
    return () => {
      timer.stop();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, [activeSession]);

  const activeProfile = useMemo(() => {
    if (!activeSession) {
      return null;
    }
    return profiles.find((profile) => profile.profile_id === activeSession.profile_id) ?? null;
  }, [activeSession, profiles]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profiles,
      activeSession,
      activeProfile,
      verifyPin,
      enroll,
      startSession,
      logout,
      refreshProfiles,
      getLockoutRemainingMs,
    }),
    [
      profiles,
      activeSession,
      activeProfile,
      verifyPin,
      enroll,
      startSession,
      logout,
      refreshProfiles,
      getLockoutRemainingMs,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}
