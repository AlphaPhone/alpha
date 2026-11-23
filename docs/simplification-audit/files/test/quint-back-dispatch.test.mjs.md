# test/quint-back-dispatch.test.mjs
- Lines: 133 | Kind: Quint replay harness written inside the test (BackDispatch simulator traces via `shell-model-traces.mjs`) + transplant (three marker slices of `agent-adapter.ts`, regex extraction of the Back script and its handling from `MainActivity.java`, esbuild bundle of `home-shell.ts` and upstream drawer code) | Verdict: PORT: move the harness to `specs/quint/refinement/application/back-dispatch.mjs` on imported functions, register in `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: Android Back, the `alphaCanGoBack` flag and the renderer layers (popover, dialog, panel, shade, drawer, menu, voice, chat detents, inner views) agree after every model step, per host (home, launcher, app, assistant). Duplicates: `test/browser/standalone-shell.spec.ts`, `mvp.spec.ts`, `mail-controls.spec.ts` press Back in a page; none replay the model. Callers/importers: `npm test` glob only; not in any family aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-20 | T10 | Slices `agent-adapter.ts` at `'  function modalPanels(){'`, `'  // Native Back reaches'`, `'  function updateBackAvailability('`, `'\n  const notesLeave'`, `'this.backHandler = (event: Event) => {'`, `'this.selectionHandler ='`; `updateBackAvailability` is a closure inside `installAgentAdapter` (`agent-adapter.ts:265`). | Export `updateBackAvailability`, `modalPanels` and the Back handler from a small `prototype/back-dispatch.ts` module; import them. | Medium |
| 2 | 22-27 | T1/T10 | Regex captures the Java string literal `String script = "..." + (home ? ... : ...) + "..."` from `MainActivity.java` and evals it as JS; second regex pins the activity's `moveTaskToBack`/`finish` line. | Move the Back script to an asset file (`android/app/src/main/assets/back.js`) loaded by `MainActivity`; the harness reads the asset. Drop the Java regex. | Medium |
| 3 | 29-33 | D13 | esbuild bundle of `home-shell.ts` + `.eliza/.../InstalledAppsGridDrawer` with `define: import.meta.env={}`. | Keep the bundle approach (real code) but via the shared driver support. | Low |
| 4 | 109-120 | T4 | 200 traces x 30 steps, 170 s budget; not part of the application aggregate. | Register in the runner. | Low |
| 5 | 122-133 | keep | Deterministic scenario: Back retires voice and each chat detent above Apps and its menu. | Keep as a named scenario in the Quint model (`BackDispatch.qnt` run) or as one case in `journeys/home-shell.spec.ts`. | Low |

## Proposed end state
`specs/quint/refinement/application/back-dispatch.mjs` exports `checkBackDispatch()`, imports the Back functions from a
real module and reads the Back script from the asset `MainActivity` loads. The runner registers it. This file is deleted.
