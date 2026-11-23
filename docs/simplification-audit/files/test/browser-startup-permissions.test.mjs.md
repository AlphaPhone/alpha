# test/browser-startup-permissions.test.mjs
- Lines: 25 | Kind: unit (T3; real `startup-browser-permissions.ts` + `startup-permission-flow.ts` via `tsImport`, with hand-built permission/media/notification ports) | Verdict: DELETE; REWRITE as cases in `test/browser/journeys/startup-permissions.spec.ts`
- Covers: in the web build, denied access shows "settings" and never re-prompts; missing APIs read as unavailable, never granted; a mic stream that ends immediately is reported unavailable and all tracks are stopped; a late notification-request rejection after the 15 s UI deadline stays observed and never re-prompts. Duplicates: Playwright `startup-access.spec.ts`, `startup-permissions-walkthrough.spec.ts` (walkthrough UI, focus, Settings review), not the denied/unsupported states. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | C3 | `tsx/esm/api` `tsImport`: a third way to load TS in this chunk (also esbuild data URLs, strip-types). | Gone with the file. | none |
| 2 | 17-25 | T8 | `t.mock.timers` drives a 15 s deadline; in Playwright use `page.clock`. | Carry as journey with `page.clock.install()`. | low |
| 3 | 6-16 | — | Denied/unsupported handling is user-visible and reachable in Chromium (`context.grantPermissions([])`, `page.addInitScript` deleting `Notification`). | Carry. | none |

## Proposed end state
Delete. `journeys/startup-permissions.spec.ts` (merging startup-access + walkthrough) adds: with permissions denied, each row offers Settings and enabling makes no prompt call (counted through an init-script wrapper); with `Notification`/`mediaDevices` absent, rows say unavailable; a notification request still pending after the deadline shows Settings and a second tap does not prompt again.
