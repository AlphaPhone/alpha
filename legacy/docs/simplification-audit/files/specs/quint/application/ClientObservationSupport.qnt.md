# specs/quint/application/ClientObservationSupport.qnt
- Lines: 123 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: Per-session handshake learning whether the agent accepts the optional `calendarDay` observation; retirement fences late comparisons. Duplicates: `test/client-observation-handshake.test.mjs` (unit, T3), `scripts/test-connection-history.ts`, `observation-turn-dispatch.mjs`. Callers/importers: `specs/quint/refinement/application/client-observation-support.mjs`, `test/quint-client-observation-support.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 4,74 | — | Loads `ClientObservationSupportSession` through `loadBrowserModule` (esbuild bundle of the real module): import-based. | None. | — |
| 2 | model 11,117 | — | `"legacy"` is an agent response class (older agent without the field), not app data; not an A1 target. | Keep. | — |
| 3 | — | T4 | Unit test `test/client-observation-handshake.test.mjs` duplicates the replay. | Delete the unit test; drop aggregate entry. | None. |

## Proposed end state
Already the target shape. One runner.
