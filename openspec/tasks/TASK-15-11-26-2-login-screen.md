# TASK-15-11-26-2 — ORBITA Mission Access Gate UI

## Solution Idea

Build a single `LoginScreen` state machine under `src/features/auth/` covering the NFC badge scan, known-badge PIN entry, seamless unknown-badge enrollment, and the session persistence choice. The screen uses the Veridia clinical light-tech tokens, an animated contactless pulse ring, a tactile six-dot PIN keypad with a live 30-second lockout countdown, and WebAuthn / Windows Hello with graceful demo fallbacks.

## ToDo Checklist

- [x] Build branded ORBITA scan step with animated NFC pulse ring and WebAuthn trigger.
- [x] Add demo badge buttons for all saved profiles plus the unregistered-badge simulator.
- [x] Implement known-badge 6-dot PIN display, tactile keypad, and lockout countdown banner.
- [x] Implement seamless two-step PIN enrollment with optional name and role selector.
- [x] Implement the `"Запомнить сессию?"` step with ephemeral and persistent choices.

## Task Report

Built the full ORBITA Mission Access Gate as a four-step state machine: animated NFC scan with WebAuthn/Windows Hello and demo badge controls, known-badge PIN entry with six dots and a tactile keypad, seamless two-step enrollment for unknown badges, and the session persistence choice. The screen surfaces the required Russian prompts, blocks input during the live 30-second lockout countdown, and uses only plain React text nodes with the Veridia clinical light-tech token palette.
