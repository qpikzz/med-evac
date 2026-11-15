# TASK-15-11-26-7 — ORBITA Rebrand

## Solution Idea

Rebrand the MED-EVAC repository to **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) end to end. Introduce a custom geometric SVG logo component (rounded clinical-blue gradient tile, white orbital ring, tilted orbit arc with telemetry node, and an ECG pulse), wire it into the Header and Login gate, update all user-facing brand copy and desktop manifests, standardise storage/event namespaces to `orbita_*` / `orbita:*` with legacy `med_evac_*` migration, and finally verify with `tsc`, Vitest, and `vite build`.

## ToDo Plan

- [x] Create task log with solution idea, plan, and completion report.
- [x] Build `src/components/OrbitaLogo.tsx` and `public/favicon.svg` with the custom vector mark.
- [x] Integrate the logo into `Header.tsx` (size 32) and `LoginScreen.tsx` (size 44), updating brand CSS.
- [x] Roll out `ORBITA` / full expansion across React UI, AI prompt, Earth-Link metadata, and Comms header.
- [x] Update `index.html`, `package.json`, `package-lock.json`, Tauri config, Cargo manifests, and Rust entrypoint.
- [x] Standardise localStorage/event namespaces to `orbita_*` / `orbita:*` and add legacy `med_evac_*` migration.
- [x] Rebrand documentation and `openspec/specs/` headers/brand references.
- [x] Update tests asserting brand strings and confirm no stray user-facing `MED-EVAC` remains.
- [x] Run `tsc --noEmit`, full Vitest suite, and `npm run build`; write final report.

## Task Report

Rebranded the entire project to **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*): added the custom `OrbitaLogo` vector mark and matching `public/favicon.svg`, replaced the Header/Login placeholder badges (32px/44px), rolled the new name and expansion through the Comms header, Earth-Link metadata, AI system prompt, desktop manifests (`index.html`, `package.json`, Tauri config, Cargo manifests/entrypoint), and spec headers, and standardised persistence to `orbita_*` / `orbita:*` while adding a tested `med_evac_*` migration. Verification passed: `npx tsc --noEmit` (clean), `npm test` (8 files, 122 tests), `npm run build` (Vite production build), and `cargo check`; the final search found no user-facing `MED-EVAC` strings remaining.
