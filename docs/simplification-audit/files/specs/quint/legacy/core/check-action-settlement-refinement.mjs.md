# specs/quint/legacy/core/check-action-settlement-refinement.mjs
- Lines: 121 | Kind: Quint refinement harness (legacy family, upstream-only code, text-seam instrumentation) | Verdict: DELETE
- Covers: replays 8 schedules of upstream `settleActionHandler` + `bindProcessingPolicy` (vendor `packages/core/src/runtime/action-handler-settlement.ts`, `security/processing-policy.ts`) against `specs/quint/legacy/CoreActionSettlement.qnt` (profiles late/outcomes). Duplicates: none in this repo; upstream owns the code (not in `scripts/core-state-patch.ts` `CORE_STATE_TARGETS`, so the product ships it unpatched). Callers/importers: `specs/quint/refinement/legacy/index.mjs:11` (aggregate legacy campaign), README line 79. No `test/*.test.mjs` imports it directly (the legacy aggregate test runs it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | T10 | `observeFile` rewrites upstream source text at two literal seams (`let effectContractDeclared = false;` and a multi-line `deliveryTail.then(...)` with tab indentation) to inject `__quint` hooks; any upstream reformat breaks it. | Delete. | None for the product. |
| 2 | 17-24 | P6 / §2.9 | Models upstream-only behaviour; it can only change on a pin bump yet runs whenever the legacy family runs. | Delete; if the owner wants this evidence, it belongs upstream (D14 follow-up). | Loses consumer-side evidence of upstream callback buffering; acceptable per AGENTS.md. |
| 3 | 103-110 | B5 | Receipt assumptions prose and checkpoint bookkeeping nobody reads beyond pass/fail. | Delete. | None. |

## Proposed end state
Delete this file, `specs/quint/legacy/CoreActionSettlement.qnt` and its legacy manifest entry, and the `CoreActionSettlement` row in `specs/quint/refinement/legacy/index.mjs`. Lower the legacy floor in `test/quint-checker.test.mjs` accordingly (or drop the legacy family).
