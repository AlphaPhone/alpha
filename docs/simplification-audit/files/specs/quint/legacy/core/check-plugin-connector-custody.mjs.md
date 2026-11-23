# specs/quint/legacy/core/check-plugin-connector-custody.mjs
- Lines: 348 | Kind: source-trace driver for a LIVE services model, misplaced in the legacy tree | Verdict: MERGE into `specs/quint/refinement/services/core-runtime/connector-custody.mjs`
- Covers: 10 schedules on the real `AgentRuntime` + isolated PGlite: late service start cannot republish a withdrawn connector, rival keys survive unload, detached continuations cannot overwrite a replacement, host claims, held disposal, shared-class runtime isolation. This is the product's own patch to upstream `packages/core/src/plugin-lifecycle.ts` (`PLUGIN_CONNECTOR_TARGET` in `scripts/core-state-patch.ts`, shipped by `scripts/build-mobile-agent.ts`). Duplicates: partial overlap with `check-plugin-lifecycle-refinement.mjs` scenario `late_start_cannot_republish_connector`. Callers/importers: only `specs/quint/refinement/services/core-runtime/connector-custody.mjs:2` (`checkCoreConnectorCustody`, run by `test/quint-plugin-connector-custody.test.mjs` and the services index).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6, D11 | A live model's driver lives in `legacy/`, blocking retirement of the legacy tree. | Move the file body into `connector-custody.mjs` (or `core-runtime/connector-custody-driver.mjs`) and fix the import. | Low: path change alters receipt hash inputs once. |
| 2 | 4-5 | — | Imports real modules via `loadTaskService`; no text slicing. Nothing to port. | Keep. | — |
| 3 | 164-170, 237 | T4-ish | Each step both `assert.deepEqual`s against a hand-written `expected(...)` and is then replayed against the model: two oracles. Acceptable; the hand oracle catches projection bugs. | Keep. | — |
| 4 | 345-346 | B5 | Re-hashes sources after the run to prove they did not change. | Drop when moving (rely on exit code). | None. |
| 5 | 9 | C3 | `denyFetch` duplicated in plugin-lifecycle and provider-execution harnesses. | One helper in `refinement/support.mjs`. | None. |

## Proposed end state
`refinement/services/core-runtime/connector-custody.mjs` contains the fixture and schedules (~340 lines); `legacy/core/plugin-connector-custody-baseline.md` is deleted; `test/quint-plugin-connector-custody.test.mjs` is unchanged and remains the only coverage of the product's connector-custody patch.
