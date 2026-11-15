# TASK-15-11-26-19 — Fix Blank Screen Runtime Error

## Solution Idea

Resolve the runtime module import that prevents ORBITA from starting and add a dark-themed root error boundary for actionable diagnostics if a component render fails.

## ToDo Plan

- [x] Inspect recent source changes and reproduce the blank-screen runtime error.
- [x] Correct the failing component import and add a root React error boundary.
- [x] Verify TypeScript, Vitest, production build, and the running app in the browser.

## Task Report

The blank screen came from the extensionless `RadiationAlert` import resolving to the lowercase `.ts` helper instead of the `.tsx` component on this case-insensitive filesystem. The import now names the component file explicitly. Added a root error boundary with dark ORBITA styling, console diagnostics, and a reload action.

`npx tsc --noEmit` passed, all 145 Vitest tests passed, and `npm run build` completed. Browser checks confirmed the login gate and Daily Check-up screen render with the contact and submit buttons visible and no runtime or console errors.
