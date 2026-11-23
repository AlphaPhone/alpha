# specs/quint/refinement/application/permission-choices.mjs
- Lines: 559 | Kind: Quint refinement harness running the real React `StartupPermissions` in JSDOM; bundle-based with two compile-time text injections and hook-order introspection (T10) | Verdict: PORT + SIMPLIFY
- Covers: startup permission walkthrough coordinator (`apps/app/src/startup-permissions.tsx`, `startup-permission-progress.ts`, upstream `permission-walkthrough.ts`): stale callbacks after owner/credential/environment/setup change, remount, disable, skip; progress write failure; completed review; browser variant. Model `PermissionChoices.qnt` (live).
- Duplicates: Playwright `test/browser/post-sign-in-setup.spec.ts` and `.production.spec.ts` drive the walkthrough UI (happy path). Callers: `test/quint-permission-choices.test.mjs`, `index.mjs:25`, `permission-coordinator-notes.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 426-432, 275 | A1/D1 | `returning-auth-preserves-completed-{4,5,6,7}` seeds completed progress at versions 1-4 and projects `s.legacyCompleted` (`saved.version < 4`). This worktree's `startup-permission-progress.ts` dropped native versions 2 and 3, so the count-5/6 (and native count-4) schedules no longer describe the product and will fail. | Delete the historical-version schedules and the `s.legacyCompleted` field here and in `PermissionChoices.qnt` (lines 11, 29, 43); keep count 7 (version 4). Update the wrapper's `observedFields.length` (40). | Model must stay green (D11): edit model and harness together. |
| 2 | 41-54 | T10 | Rewrites `startup-permissions.tsx` at `const ticket = sequence.current, credentialId = connection.cloudAccount?.credentialId;` (after `async function allow() {`) and upstream `permission-walkthrough.ts` at `      pending = current;` to publish private state to the fixture. | Observe through ports instead: the request port already sees which permission is asked and when; the ticket can be derived from request order. If a private value is essential, ask upstream for a read-only hook (D14). | Medium: `s.ticket`, `s.flowTickets`, `s.pendingChoice` may need to leave the projection. |
| 3 | 26-27, 168-180 | T10 | Wraps `useState`/`useRef` to record hook values and asserts exactly 13 states and 12 refs, then reads `states[0..12]` by index. Adding one hook breaks the harness. | Project from the DOM (heading, buttons, status), storage and port calls only; drop component-internal fields from the model mapping. | Medium. |
| 4 | 61-65, 351 | B5 | Hashes sources before/after and asserts unchanged; captures `contracts.mjs`, `index.mjs`, the wrapper test. | Drop. | Low. |
| 5 | 92-96 | T8 | Real `setTimeout` except for the 20 s skip timer, which is captured. Fine; keep the single clock policy. | None. | — |
| 6 | 358-360 | A7 | CLI block; nothing runs it. | Delete. | Low. |

## Proposed end state
About 350 lines: same real component and ports, ~33 schedules minus the historical-version ones, a DOM/port-only projection, no source injection, no hook introspection, one test entry. The doc `permission-coordinator-notes.md` folds into the header.
