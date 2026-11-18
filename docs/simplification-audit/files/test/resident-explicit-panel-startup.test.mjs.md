# test/resident-explicit-panel-startup.test.mjs
- Lines: 21 | Kind: transplant (slices `connectResident` from `connection-ui.tsx` up to `async function connectCloud(` into `vm`) | Verdict: REWRITE as one case in `journeys/connection-cloud.spec.ts`
- Covers: when resident startup finishes after the user opened the plan/account/agent panel, the panel and its refusal stay open. Duplicates: none in `test/browser`. Callers/importers: `npm test` glob; `test/fixtures/workflow-device-bindings.mjs` (also used by `scripts/test-connection-history.ts`, `test/workflow-device-bindings-fixture.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9 | T2 | Slice ends at `connectCloud(`, a C4 deletion target: the test breaks when hosted code is removed. | Delete. | Low |
| 2 | 13 | T3 | ~35 hand-written stubs in one object literal. | Goes with the file. | Low |
| 3 | 7 | T9 | `CONTROLLER_SOURCE` env knob, no setter in repo. | Goes with the file. | Low |

## Proposed end state
Delete. One journey case: resident stub delays `connect`; the user opens the plan panel; startup completes with an
account-mismatch admission; the plan panel stays open with "different account" text and the agent shows unavailable.
