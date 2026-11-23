# specs/quint/legacy/core/check-approval-service-refinement.mjs
- Lines: 209 | Kind: Quint refinement harness (legacy, executes a HISTORICAL upstream fragment) | Verdict: DELETE
- Covers: 13 schedules / 81 checkpoints of `ApprovalService` from upstream `approval.ts` materialised from historical revision `4787d51a…` (not the current pin) against `specs/quint/legacy/CoreApprovalService.qnt`. Duplicates: `specs/quint/services/CoreApprovalServiceCurrent.qnt` models the current upstream service (research §2.9 names this exact twin). Callers/importers: `specs/quint/refinement/legacy/index.mjs:12`, `test/quint-core-approval-service.test.mjs:4` (asserts `historicalRevision`, 13 traces, 81 checkpoints).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15, 135-136 | T10 | `timerPorts` rewrites the import line `import { logger } from "../logger.ts";` of the historical `approval.ts` to inject fake timers. | Delete. | None. |
| 2 | 135-136, 183-187 | P6 | Runs code the product does not ship (historical fragment, materialised from Git objects; forces `quint:prepare-history` network fetch). Its own assumptions say it "does not qualify ... the current approval protocol". | Delete. | None for shipped behaviour. |
| 3 | test file | T4, B5 | `test/quint-core-approval-service.test.mjs` asserts exact counts (13/81) and the historical hash: evidence ceremony. | Delete the test with the harness. | None. |

## Proposed end state
Delete harness, `legacy/CoreApprovalService.qnt` + manifest entry, the index row and `test/quint-core-approval-service.test.mjs`. Current approval behaviour remains modelled by `services/CoreApprovalServiceCurrent.qnt` (itself upstream-only; separate decision).
