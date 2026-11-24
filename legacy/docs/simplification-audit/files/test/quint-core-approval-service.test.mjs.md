# test/quint-core-approval-service.test.mjs
- Lines: 14 | Kind: Quint refinement wrapper over a historical model (`checkApprovalServiceRefinement` from `specs/quint/legacy/core/check-approval-service-refinement.mjs`) | Verdict: DELETE
- Covers: the historical upstream approval service settlement protocol (13 traces, pinned historical revision). Duplicates: `test/quint-current-approval-service.test.mjs` replays the current approval service against `services/CoreApprovalServiceCurrent.qnt` (twin model, research §2.9). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P6, A1 | Driver lives in `specs/quint/legacy/core`: a 2026-11 translation of upstream TLA+ at revision `4787d51a…`, fetched by `quint:prepare-history` on every verify. DECISIONS D11 retires the legacy family. | Delete with `specs/quint/legacy/**` and `scripts/prepare-quint-history.ts`. | Low |
| 2 | all | T5 | Replays target upstream core only; AGENTS.md puts shared behaviour upstream. | Upstream follow-up (D14) if the behaviour needs a model. | Low |
| 3 | 8 | B5 | Pins `historicalRevision` hash. | Gone. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/core/check-approval-service-refinement.mjs` and the `specs/quint/legacy/manifest.json` rows (CoreApprovalService).
