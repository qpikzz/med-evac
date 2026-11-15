# TASK-15-11-26-1 — Auth Store, PIN Security & Profile History Isolation

## Solution Idea

Add an offline-first authentication domain under `src/features/auth/` with a credential registry (`AuthStore`) seeded with the three demo profiles. PINs are verified against salted SHA-256 digests using Web Crypto. The store enforces a fixed 30-second lockout after every three consecutive failures and exposes session helpers plus a 300,000 ms inactivity timer for ephemeral sessions. Each profile receives its own `HistoryStore` instance keyed by `orbita_history_<profile_id>`: `astro-01` uses the bundled synthetic dataset, while all other profiles use an empty dataset. A React `AuthProvider` owns the active session and bridges the history registry into `AppStateContext`.

## ToDo Checklist

- [x] Add auth domain types, PIN hashing helpers, and seeded profile registry.
- [x] Implement fixed 30-second lockout and salted SHA-256 verification.
- [x] Implement profile-scoped HistoryStore registry (`astro-01` synthetic, others empty).
- [x] Add session persistence helpers and 5-minute inactivity watchdog.
- [x] Wire `AuthProvider` into app bootstrap and make `AppStateContext` profile-aware.

## Task Report

Implemented the offline `AuthStore` with three salted SHA-256-seeded profiles, strict six-digit PIN validation, and a fixed three-attempt/30-second lockout that resets after each lock window. Added the profile-scoped history registry keyed by `orbita_history_<profile_id>` (astro-01 loads the full synthetic dataset including Day 40, all other profiles start empty), a five-minute inactivity timer helper, an `AuthProvider` session owner, and a profile-aware `AppStateContext`. TypeScript compilation completed with zero errors after the integration.
