# specs/quint/application/WorkflowClockAdmission.qnt
- Lines: 88 | Kind: Quint model (live: manifest, 7 scenarios, 5 invariants) | Verdict: KEEP; PORT harness
- Covers: Workflows owns the Clock draft until departure; review needs a visible idle draft; an alarm dispatch needs a saved opening receipt; departure, hidden page or mock mode retire the opening; a browser Clock show never writes an alarm receipt. Duplicates: Android `ClockHandoffInstrumentedTest` covers the native side, not this admission. Callers/importers: manifest; harness `refinement/application/workflow-clock-admission.mjs` (76) + fixture `test/fixtures/workflow-clock-admission.mjs` (173); `test/quint-workflow-clock-admission.test.mjs` (12) and the aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 44-58 | T2 / T10 | `test/fixtures/workflow-clock-admission.mjs` bundles `clock-adapter.ts` (real import, good) but slices `agent-adapter.ts` from `'  function context(shell: Shell) {'` to `'  p.componentDidMount'`, `model.js` from `'  leave() {'` to `'\n\n  preset('`, and `template.html` from `'<sc-if value="{{is.workflows}}">'` (styles stripped by regex). | PORT: export the agent `context(shell)` builder from the agent-adapter split, import the shell `leave` from the extracted shell core, and render the Workflows template through the product template renderer. Move the fixture next to the harness (it is only used by it). | Medium |
| 2 | 33, 60 | — | `setMock` models the dev mock-mode switch; mock mode is a retained test-mocks capability (D6). | Keep. | — |
| 3 | 22-27 | — | `openClock` uses `s' = s` when not current — a stutter that counts as a successful step; acceptable because the harness observes "nothing happened". | None. | — |
| 4 | test | T4 | Runs per-model and in the aggregate. | Run once. | Low |

## Proposed end state
Model unchanged. Harness imports `clock-adapter.ts`, an exported agent context builder and the shell core; no text slices of `agent-adapter.ts`, `model.js` or `template.html`. Fixture merged into the harness file. One runner.
