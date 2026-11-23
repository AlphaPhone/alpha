# test/quint-core-plugin-lifecycle-refinement.test.mjs
- Lines: 16 | Kind: Quint refinement wrapper over a historical model (`checkPluginLifecycleRefinement` from `specs/quint/legacy/core/check-plugin-lifecycle-refinement.mjs`) | Verdict: DELETE
- Covers: original plugin-lifecycle profiles vs runtime ownership schedules; pins two named mismatches. Duplicates: none in this repo; the behaviour is upstream (`vendor/eliza`) code. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream `plugin-lifecycle-model.test.ts` only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | 12-15 | B5 | Pins mismatch names `PluginRegistrationRollbackVisibility`, `PluginRuntimeStopLookup`. | Gone. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-plugin-lifecycle-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CorePluginLifecycle, …Register, …Services).
