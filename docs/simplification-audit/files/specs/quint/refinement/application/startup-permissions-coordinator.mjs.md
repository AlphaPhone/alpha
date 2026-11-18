# specs/quint/refinement/application/startup-permissions-coordinator.mjs
- Lines: 501 | Kind: Quint refinement harness — real React component bundled by esbuild, rendered in JSDOM with hook-wrapping React shim and controlled native ports | Verdict: KEEP (trim legacy scenarios, drop hook-index pinning)
- Covers: `PermissionWalkthrough` (receipt id `PermissionWalkthroughCoordinator`) — startup permission walkthrough (`apps/app/src/startup-permissions.tsx`, `startup-permission-progress.ts`, `startup-permission-flow.ts`): seven-step progress, held requests across owner change/ABA/sign-out/disable/remount, progress write failure, required-flow dismissal blocked, Settings retry, completed review. Duplicates: startup-permissions Playwright journey (first-run flow) covers the visible happy path; `permission-choices.mjs` covers a sibling model. Callers: `test/quint-permission-coordinator-refinement.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 440-449, 204 | A1 / D1 | `auth-ready-preserves-completed-{4,5,6,7}` seed progress `version: count-3` (1, 2, 3, 4). Versions 2 and 3 were removed from `startup-permission-progress.ts` in this branch (native accepts only 4), so counts 4, 5 and 6 (versions 1-3 on the native platform) now seed records the native reader no longer accepts, and `s.legacyCompleted` (`version<4`) models the deleted historical-install path. | Keep only `count = 7` (version 4); delete `s.legacyCompleted` from the projection and `legacyCompleted`/`historicalInstall`/`legacyCompletionTest` from `PermissionWalkthrough.qnt` (lines 9, 15, 75, 80, 113, 129). | M (harness likely fails today) |
| 2 | 125-128, 137-139 | T10 | Asserts exactly 13 `useState` and 12 `useRef` calls and reads state by position (`states[4]`, `refs[7]`). Any hook added/reordered breaks the harness without behaviour change. | Observe through DOM (heading, buttons, status), durable storage and port calls; for `generation/ticket` either drop from the projection or have the component expose a `data-` attribute in test-mocks builds. | M |
| 3 | 19-46 | — | Bundles the real component with an esbuild resolver plugin that swaps `react`, `@capacitor/core`, `platform-plugins`, `connection-ui`. Real import, good. | Keep. | — |
| 4 | 47-53, 491-492 | B5 | Hashes test/aggregate/index files and re-hashes after the run to detect concurrent edits. | Drop with receipts. | L |
| 5 | 499-501 | T9 | Self-run CLI branch. | Delete. | L |
| 6 | 493-496 | — | Returns static obligations text. | Drop if aggregate report is deleted. | L |

## Proposed end state
~400 lines: same scenarios minus historical-version ones, projection from DOM/storage/ports rather than hook positions,
model without `legacyCompleted`. One per-model test.
