import type { AuthProfile } from "./types";

// Salted SHA-256 digests for the demo PINs (salt + ":" + PIN).
// Plain-text PINs are intentionally absent from persisted profile records.
const SEED_PROFILES: AuthProfile[] = [
  {
    profile_id: "astro-01",
    display_name: "Cmdr. Alex Vance",
    role: "astronaut",
    credential_id: "orbita-nfc-astro-01",
    pin_hash: "8c13c05366060222437bf7aa9f9343072e7016c25b8b264d64b92be2cddf9b50",
    salt: "orbita-seed-astro-01",
    history_seed: "synthetic",
    side: "space",
    created_at: "2026-10-01T00:00:00.000Z",
  },
  {
    profile_id: "astro-02",
    display_name: "Dr. Maya Lin",
    role: "astronaut",
    credential_id: "orbita-nfc-astro-02",
    pin_hash: "7ace097899f4a5ff796fa1898bdb39473484de13834cf2eab18e94ced7bd99b2",
    salt: "orbita-seed-astro-02",
    history_seed: "empty",
    side: "space",
    created_at: "2026-10-01T00:00:00.000Z",
  },
  {
    profile_id: "ground-01",
    display_name: "Flight Surgeon (Houston)",
    role: "ground_operator",
    credential_id: "orbita-nfc-ground-01",
    pin_hash: "cfeda797e8b01cfe5a74ffe7ef319fb3ed8394df75ff6dce362ca358ec345396",
    salt: "orbita-seed-ground-01",
    history_seed: "empty",
    side: "earth",
    created_at: "2026-10-01T00:00:00.000Z",
  },
];

export function cloneSeedProfiles(): AuthProfile[] {
  return SEED_PROFILES.map((profile) => ({ ...profile }));
}
