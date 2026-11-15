# TASK-15-11-26-21 — Comms Full Redesign

## Solution Idea

Replace the nested Comms panels with a two-card channel deck and streamlined chat surfaces. Persist Earth chat threads per astronaut profile, attach immutable check-up snapshots on demand, and expose their details in an accessible slide-over drawer.

## ToDo Plan

- [x] Read the applicable specifications and inspect the existing Comms, AI Helper, Earth-Link, profile, and check-up wiring.
- [x] Add profile-scoped Earth thread persistence, Day 38–39 seed messages, telemetry snapshots, and focused store tests.
- [x] Redesign the channel deck and streamline the Onboard SI conversation while preserving existing safety and model fallbacks.
- [x] Replace the Earth draft panel with a two-way persistent chat and slide-over telemetry drawer.
- [x] Apply responsive dark-theme styling, remove redundant/debug clutter, and add view-level tests.
- [x] Run TypeScript, Vitest, and production build verification.

## Task Report

Implemented the two-card Comms deck, streamlined Onboard SI chat, profile-persisted Earth threads with seeded Day 38–39 messages, role-aware replies, optional seven-day telemetry attachments, and an accessible slide-over drawer. TypeScript passed; all 159 tests passed; the production build completed. Vite reports a JavaScript chunk above its 500 kB advisory threshold.
