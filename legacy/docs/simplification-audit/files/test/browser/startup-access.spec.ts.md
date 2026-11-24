# test/browser/startup-access.spec.ts
- Lines: 67 | Kind: Playwright chromium, 2 tests; component test on a second Vite dev server with virtual modules replacing `runtime/connection-ui` and `runtime/google-connection-ui`, plus an inline fake Capacitor bridge (s3 r14) | Verdict: REWRITE as cases in `journeys/startup-permissions.spec.ts` on the production lane (`flag-off-android` bridge)
- Covers: the native (Android) access checklist: seven steps in order, limited grants shown honestly (Location "Approximate", Photos "Selected"), Continue reachable and ≥44 px at 274 px width and 2× text, heading focus, no request call while reviewing, completion not reshown after reload, Settings review restarts at the heading, targeted reopen (camera) preserves the completion record. Duplicates: `startup-permissions-walkthrough.spec.ts` (browser path), `resident-first-run.production.spec.ts`, `post-sign-in-setup.spec.ts` (checklist after sign-in). Callers/importers: chromium; imports `./accessibility-states` (`setTextScale`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T6 / P3 | Starts its own Vite server with `resolveId`/`load` hooks that swap two product modules for string-built stubs and render `StartupPermissions` alone. This is a unit test of one component with module substitution; it also costs a cold Vite transform per worker. | Drive the real app on the production lane: `flagOffAndroid(page,{permissions:…})` already fakes the native bridge, and sign-in reaches the checklist. | Medium: geometry at 274 px is only checked here. |
| 2 | 9-11 | P2 / C1 | `connectionController` / `googleConnectionController` stubs re-declare their shapes as JS strings; any change to the real interface silently diverges. | Gone with the rewrite. | None |
| 3 | 20-31 | T7 | Hand-written `Capacitor.PluginHeaders` + `nativePromise` for eight plugins: one of the 57 bridge fakes. | Harness bridge handlers per plugin. | None |
| 4 | 59, 61 | D9 | `for(let i=0;i<7;i++)` Continue loops encode the step count. | Loop over the step names (as test 1 does). | None |
| 5 | 63 | P2 | Targeted reopen via `window.dispatchEvent(new CustomEvent('alpha:startup-permissions-reopen',{detail:{permission:'camera'}}))`. | Reach it from Settings → Privacy → Permissions → Camera if that UI exists; otherwise keep the event as the documented native entry. | Low |

## Proposed end state
Two cases in `journeys/startup-permissions.spec.ts` (production project): (1) after sign-in the seven-step checklist shows each step in order with honest limited-grant labels, never requests on its own, keeps Continue reachable at 274 px and at 2× text, and does not reappear after reload; (2) reopening from Settings starts at the heading and a targeted Camera review leaves the completion record unchanged. No second Vite server, no module substitution. Delete this file.
