import { ROLE_LABELS } from "./constants";
import type { AuthProfile } from "./types";

const DEMO_PINS: Record<string, string> = {
  "astro-01": "111111",
  "astro-02": "222222",
  "ground-01": "333333",
};

export interface DemoBadgeSummary {
  subtitle: string;
  pinLabel: string;
}

export function demoBadgeSummary(profile: AuthProfile): DemoBadgeSummary {
  const subtitle =
    profile.role === "ground_operator"
      ? ROLE_LABELS.ground_operator
      : `${ROLE_LABELS[profile.role]} · ${
          profile.history_seed === "synthetic" ? "40-day history" : "Empty history"
        }`;
  const pin = DEMO_PINS[profile.profile_id];

  return {
    subtitle,
    pinLabel: pin ? `NFC · PIN: ${pin}` : "NFC · Enrolled",
  };
}
