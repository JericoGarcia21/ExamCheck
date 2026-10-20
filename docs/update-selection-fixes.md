# Update and student-selection fixes

2026-10-20. Local fix only; no deployment performed.

## Evidence and causes

The installed `vite-plugin-pwa` prompt-mode client sends SKIP_WAITING and reloads on Workbox's `controlling` event. The previous generated `dist/sw.js` contained the skip-waiting message handler but no clientsClaim call. `workbox.clientsClaim` was absent from Vite configuration. Thus a new worker could activate without taking control of open app windows, leaving the existing client and its update banner unchanged. Workbox documents that the [controlling event depends on claiming clients](https://developer.chrome.com/docs/workbox/modules/workbox-window).

`SessionPage`'s student selection handler unconditionally cleared the paper result, preview, overrides and review state, including when selecting the already selected student. `StudentPicker` forwarded every click. Repeated selection therefore reset the open checking flow. No back-navigation call was found on the student selection path; actual browser-history navigation has not been reproduced.

## Changes

- Enable Workbox clientsClaim while retaining prompt-mode activation. Updates still wait for user approval. Do not clear application storage or caches as a workaround.
- Disable repeated update actions while applying; display progress, catch rejected activation requests, and restore a Retry action after a bounded 20-second wait. Keep the save-work notice.
- Ignore selection of the current student and the second mouse click of a double-click. Preserve keyboard activation (click detail zero). Keep switching to a different student functional.
- Normalize CRLF/LF in reader-bundle comparisons: Windows checkout converted sources and produced false stale-bundle failures despite equivalent code.

## Verification

- `npm.cmd run verify` passed the existing verification chain: 74 tests, lint, generated bundle checks, Deno source/bundle checks, TypeScript, production build and PWA generation.
- New selection regression invokes click handlers for the selected student, another student, a second click, and keyboard activation.
- `node scripts/check-pwa-build.mjs` passed against the actual generated worker and Workbox module in a mocked service-worker environment. It verifies no unprompted skipWaiting, user-approved activation, and client claim on activation. This check is now appended to `npm run verify` after build.
- Lint passed after adding the lifecycle check. No Edge Function logic or database migration changes are needed for these bugs.

No browser is available in the session. A real installed-app update from one deployed version to the next, multiple open tabs, offline recovery, mobile double-tap and update-prompt focus/visual behavior remain unverified. The platform and whether “back” meant a cleared form or actual navigation were requested but not yet confirmed.
