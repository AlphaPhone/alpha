# specs/quint/application/ShellNavigation.qnt
- Lines: 149 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Shell Back order (modal > shade > drawer > chat > view), completed-action navigation claims, Settings row focus identity, send/reply fencing by view revision and suspension, draft retained. Duplicates: BackDispatch, ShellScreen, ChatDock (application) overlap on Back order and chat states; this model is the summary one the README row 11 describes. Callers/importers: `surfaces.mjs` `shellNavigation` and `shell-coordinator.mjs` `checkShellCoordinator` (Vite + Playwright Chromium), both only via aggregate `index.mjs:115,146`. README rows 11.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T2/T10 | `surfaces.mjs:10-12` slices `prototype/model.js` from `  goHome(chat) {` to `  /* ---- Android` and pastes the methods into a fake `class Shell` in `vm`; covers only open/back for 5 views. | PORT with the Stage F `model.js` split: export navigation methods (or a `createShellNavigation(state)` module) and import them. | M |
| 2 | harness | P1 | `shell-coordinator.mjs` starts a Vite server and Chromium inside the host test suite and hashes `sourcePaths()` (every app/android file) as inputs, so any change re-runs it. | Move this replay into the Playwright lane (`journeys/home-shell.spec.ts` fixture) or keep it in the formal lane with a path filter on `apps/app/src`. | M |
| 3 | 14-16 | - | `Views` lists all 19 `AlphaView` values including `passwords`; still matches `runtime/alpha-client.ts:6-25`. Re-check after D3 (password transfer) removals: the view stays, only transfer goes. | None now. | - |
| 4 | manifest | - | 6 `sources`, no symbols; README says sources `ViewNavigationClient.capture`, `deliver`, `cancel`. | None. | - |

## Proposed end state
- Keep model; harness imports navigation from the split `model.js`; browser replay moved out of host tests.
