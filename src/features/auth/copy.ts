import { PIN_LENGTH } from "./constants";

export const SCAN_COPY = {
  title: "Tap NFC Badge to Reader",
  subtitle: "Select a demo crew badge below or simulate a new unregistered tag",
  gateTag: "Mission Access Gate",
  cancel: "Cancel",
  demoBadges: "Demo crew badges",
  newBadge: "+ Tap New Unregistered Badge",
  resetDemoBadges: "Reset Demo Badges",
  resetFailed: "Unable to reset demo badges. Please try again.",
} as const;

export const PIN_COPY = {
  title: `Enter ${PIN_LENGTH}-Digit PIN`,
  back: "Use another badge",
  invalidPin: "Incorrect PIN. Try again.",
  verifyFailed: "Unable to verify the PIN. Tap the badge again.",
  lengthError: `PIN must be ${PIN_LENGTH} digits.`,
  lockout: (seconds: number): string =>
    `Too many incorrect attempts. Try again in ${seconds}s.`,
} as const;

export const ENROLLMENT_COPY = {
  createPrompt: `New badge detected. Create a ${PIN_LENGTH}-digit PIN`,
  confirmPrompt: `Confirm your ${PIN_LENGTH}-digit PIN`,
  mismatch: "PINs do not match. Please try again.",
  failed: "Unable to create the profile. Please try again.",
  displayNameLabel: "Display name (optional)",
  displayNamePlaceholder: "e.g. Cmdr. Nova Reyes",
  roleLabel: "Crew role",
  continueButton: "Continue",
  creatingButton: "Creating profile...",
  createButton: "Create account",
} as const;

export const SESSION_COPY = {
  question: "Remember this session?",
  ephemeral: "No — log out after 5 min of inactivity",
  persistent: "Yes — keep me signed in",
  ephemeralHint: "5-minute inactivity auto-lock",
  persistentHint: "Persistent until manual logout",
  ephemeralSubtitle: (displayName: string): string =>
    `${displayName} · Ephemeral session locks after 5 minutes of inactivity.`,
} as const;

export const HEADER_COPY = {
  savedProfiles: "Saved profiles",
  addAccount: "Add Account",
  logout: "Sign Out",
  forgetFailed: "Unable to forget this account. Please try again.",
} as const;
