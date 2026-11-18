# specs/quint/refinement/application/workflow-clock-admission.mjs
- Lines: 76 | Kind: Quint refinement harness over `test/fixtures/workflow-clock-admission.mjs` (fixture slices `agent-adapter.ts`, `model.js` `leave()` and the Workflows part of `template.html`) | Verdict: KEEP (fixture PORT)
- Covers: `WorkflowClockAdmission` — a Workflows "open Clock" handoff publishes and settles one reviewed device receipt; Back restores selection; retained openers are admitted only during the exact Workflows visit; departure, mock toggle and visibility retire held writes; browser direct-show path. Product: `apps/app/src/prototype/clock-adapter.ts`, `agent-adapter.ts`, `model.js`, `template.html`, `runtime/clock-contract.ts`, `clock-handoff-history.ts`. Duplicates: `android/.../ClockHandoffInstrumentedTest.java` (native intent side), Workflows Playwright specs (UI). Callers: `test/quint-workflow-clock-admission.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T10 (via fixture) | Fixture cuts `'  function context(shell: Shell) {'`→`'  p.componentDidMount'` from `agent-adapter.ts`, `'  leave() {'`→`'\n\n  preset('` from `model.js`, and from `'<sc-if value="{{is.workflows}}">'` in `template.html`. | Port the fixture after the `model.js`/agent-adapter split (owned by the `test/fixtures` chunk). Harness unchanged. | M |
| 2 | 11-13 | B5 | Hashes fixture, `upstream.lock.json`, `support.mjs`. | Drop with receipts. | L |
| 3 | 58-60 | — | Runs the mock-flag schedule with flag off and on; the "on" case needs `ELIZA_DEV_ALLOW_TEST_MOCKS` semantics, a D6 dev surface. | Keep while the mock path exists. | L |

## Proposed end state
Unchanged schedules; the fixture imports real modules instead of slicing; one per-model test entry.
