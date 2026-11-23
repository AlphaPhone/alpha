# specs/quint/refinement/services/identity-comms-traces.mjs
- Lines: 237 | Kind: formal harness library (Quint ITF trace generation, Quint-text parsing, step-by-step replay, esbuild `sourceModule`, `settle`) | Verdict: MERGE into `specs/quint/refinement/itf-replay.mjs`
- Covers: generic model→implementation replay used by Phone, SMS, MMS, Contacts replays and several application tests. Duplicates: `specs/quint/refinement/assistant-model-traces.mjs` (same `plain`/`stepParameters`/`scenarioActions`/`modelTraces`/`replayTraces`), `services/maps-model-traces.mjs`, `services/inbox-workflows-model-traces.mjs`; `sourceModule` twins in `services/support.mjs` and `application/support.mjs`. Importers (10): `services/{phone-session-replay,sms-send-replay,contacts-session-replay,mms-compose-replay}.mjs`, `test/quint-{view-admission,connection-controller,settings-listener-reads,delegation-receiver}.test.mjs`, `test/fixtures/{settings-model-traces,observed-sms-adapter}.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-237 | D11 | Name says "identity-comms" but nothing is identity- or comms-specific; half its importers are application/settings tests. | Merge into the single `itf-replay.mjs` proposed for `assistant-model-traces.mjs`; re-point the 10 importers. | Low |
| 2 | 30-112 | T10 / C5 | `balanced`, `split`, `literal`, `callOf`, `stepParameters`, `scenarioActions` hand-parse `.qnt` text with regex and bracket counting; fourth copy in the repo. `model-state.mjs` already uses the real Quint parser. | One AST-based reader in `itf-replay.mjs`. | Medium |
| 3 | 16-18, 114-118 | C3 | Own Quint CLI path, seed `20261107`, spawn wrapper (also in `check-traces.mjs` and the twins). | One `quint()` + `SEED` export. | Low |
| 4 | 214-231 | C3 | Third `sourceModule` esbuild loader with a different signature (regex-keyed stubs, multi-entry, externals) from `services/support.mjs` (name-keyed, `beforeImport`). | One loader with both options in `refinement/support.mjs`. | Low |
| 5 | 182-210 | — | `replayTraces` is the actual check (deepEqual per step) and is sound. | Keep in the merged file. | — |

## Proposed end state
File removed; its `modelTraces`/`replayTraces`/`plain`/`settle` live once in `refinement/itf-replay.mjs`, `sourceModule` once in `refinement/support.mjs`.
