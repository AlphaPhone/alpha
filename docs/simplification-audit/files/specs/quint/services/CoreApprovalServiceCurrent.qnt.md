# specs/quint/services/CoreApprovalServiceCurrent.qnt
- Lines: 116 | Kind: Quint model, live (7 tests, 6 invariants, 4 witnesses, `temporal`); **upstream-only** (`vendor/eliza/packages/core/src/services/approval.ts`, `runtime/retirement.ts`) | Verdict: KEEP (upstream-pin lane); DELETE its legacy twin `specs/quint/legacy/CoreApprovalService.qnt`
- Covers: upstream core's synchronous callback-bearing approvals. It covers timer fire vs selection, a refused duplicate delivery, a callback failure, cancel and draining stop. Properties: at most one callback, result agreement, a single owner of the task, refused/stopped admissions have no effect, and stop waits for work. Duplicates: `specs/quint/legacy/CoreApprovalService.qnt` (119 lines, the historical translation of the same unit, research §2.9). Callers: harness `refinement/services/current-approval-service.mjs` (220 lines), wrapper `test/quint-current-approval-service.test.mjs`, aggregate (with an obligation entry). It is named in `specs/quint/legacy/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 5 | P6 | The harness imports `bundleVendorCore, deferred, observeFile, tick` from `specs/quint/legacy/core/source-support.mjs`. Retiring `specs/quint/legacy` breaks it. | Move `source-support.mjs` (or those four helpers) to `specs/quint/refinement/support.mjs` before deleting `legacy/`. | high (ordering) |
| 2 | — | T4 / §2.9 | The legacy twin models the same upstream service. | Delete the legacy one with the legacy family. This model is the current one. | low |
| 3 | — | §2.9 | Changes only on an upstream pin bump. | Select it only on `upstream.lock.json`/vendor pointer changes, or move it upstream (owner Q4). | low |
| 4 | 84 | — | It is the only services model with a `temporal` property. The fairness comment states its assumption explicitly. | Keep. Make sure the nightly Apalache lane still runs `temporal` once `quint-model-check.yml` is removed. | medium |

## Proposed end state
One approval-service model (this one) in an upstream-pin lane. The harness uses `refinement/support.mjs` helpers, and there is no legacy twin.
