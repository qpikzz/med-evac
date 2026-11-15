# TASK-14-11-26-1 — Environment, Test Runner & CSP Setup

## 1. Solution Idea
Add Vitest as the unit-test runner for the Vite/React/TypeScript project, expose `test` scripts, and configure the Tauri v2 CSP so the webview can reach only local resources plus the local Ollama runtime at `http://127.0.0.1:11434`. Verify that no default Tauri starter icons, `vite.svg`, `tauri.svg`, `react.svg`, or NASA insignia remain. Record new dev tooling in `SOURCE.md`.

## 2. ToDo Plan
- [x] Install Vitest as a dev dependency and record its exact version in `SOURCE.md`.
- [x] Add `test` and `test:watch` npm scripts.
- [x] Add `vitest.config.ts` (Node environment, `src/**/*.test.ts`).
- [x] Set Tauri v2 CSP with `connect-src 'self' http://127.0.0.1:11434` (plus dev/ipc allowances).
- [x] Verify repository assets/icons contain no default starter or NASA branding.
- [x] Document Vitest, license, and URL in `SOURCE.md`.

## 3. Task Report
Installed Vitest `5.1.0` (MIT) as a dev dependency, added `test`/`test:watch` scripts and `vitest.config.ts` (Node environment, `src/**/*.test.ts`). Replaced the null Tauri CSP with a policy that keeps `default-src 'self'`, allows local IPC/dev websockets, and adds `connect-src 'self' http://127.0.0.1:11434` for Ollama. Verified `public/med-evac.svg` and all `src-tauri/icons` are the custom ORBITA mark; no default `vite.svg`/`tauri.svg`/`react.svg` or NASA insignia remain. Documented Vitest and its license in `SOURCE.md`.
