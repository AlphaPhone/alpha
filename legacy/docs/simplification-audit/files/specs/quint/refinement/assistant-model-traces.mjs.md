# specs/quint/refinement/assistant-model-traces.mjs
- Lines: 202 | Kind: formal harness library (Quint ITF trace generation + implementation replay) | Verdict: KEEP, SIMPLIFY and rename to `specs/quint/refinement/itf-replay.mjs`
- Covers: generates model traces (named `run` scenarios, witness walks, random `step` walks) with the pinned Quint CLI and replays them against a driver, comparing an observation after every step. Duplicates: the Quint-spawning and seed logic of `check-traces.mjs`; the Quint-text parsing that `model-state.mjs` already does with the real parser. Importers (8): `application/{composer-send,own-notice-question,pending-action-recovery,quiet-voice-retry,voice-owned-navigation}.mjs`, `native/{native-stream-bridge,renderer-speech-chunk,speech-cleanup-latch}.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6, 15 | D11 | The file is a generic model-to-implementation replay library; nothing in it is about "assistant". The name misleads readers into thinking it is one model's harness. | Rename to `itf-replay.mjs` and update the 8 importers. | Low |
| 2 | 30-105 | T10 / C5 | `balanced`, `splitArguments`, `literal`, `callOf`, `stepParameters`, `scenarioActions` hand-parse Quint source text with regexes and bracket counting (`/\baction step\s*=/`, `any {`, `.then(`). Any reformatting of a model (comment inside `any {}`, string with a comma, nested `all {}`) breaks replay. `model-state.mjs` already parses models with `parsePhase1fromText`. | Read `step`'s `any` arms and the `run` chains from the Quint AST (same parser call as `model-state.mjs`); delete the six text helpers. | Medium: AST shapes for `run` chains need one small walker. |
| 3 | 16-17, 107-111 | C3 | Own Quint CLI path, seed `20261107` and `spawnSync` wrapper; `check-traces.mjs` has the same CLI path, the same seed and a second spawn wrapper (via `runQuintChecker`). | One `quint(args)` helper and one `SEED` constant in `check-traces.mjs` (or a `quint-cli.mjs`), imported here. | Low |
| 4 | 24 | — | `plain` sorts sets by comparing `JSON.stringify` strings with `<`; fine but equal keys return `1` (unstable comparator). | Use `localeCompare` / return 0 on equality when touching. | Low |
| 5 | 175-202 | — | `replayTraces` is the real check (assert.deepEqual per step) and is well-shaped. | Keep. | — |

## Proposed end state
`itf-replay.mjs` exports `plain`, `modelTraces`, `replayTraces` (and `stepParameters`/`scenarioActions` only if a caller needs them).
Model text is read through the Quint parser, not regexes, so formatting models never breaks replays.
The Quint CLI invocation and seed come from one shared helper used by `check-traces.mjs` too.
No behaviour change for the 8 harnesses beyond the import path.
