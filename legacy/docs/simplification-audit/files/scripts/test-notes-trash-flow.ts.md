# scripts/test-notes-trash-flow.ts
- Lines: 189 | Kind: unit (pure Trash policy functions, upstream `createNotesTrashPolicy`, plus a re-export identity check) | Verdict: DELETE
- Covers: Trash document validation, ordering, 30-day expiry and labels, idempotent purge planning, restore position, capacity limits, lower-limit hosts, re-export of upstream `planInterruptedPermanentDeletion`. Duplicates: the policy is upstream (`plugin-notes/src/client/notes-trash-policy.ts`; Alpha's `runtime/notes-trash-policy.ts` passes 30 days and limits); `test/browser/notes-trash.spec.ts` ("Deleting permanently", "days left"), `notes-trash-full.spec.ts` (capacity), `notes-trash-recovery.spec.ts`, `notes-trash-resume.spec.ts` drive the product. Lines 146-178 test the upstream PR's lowered-limit case; 180-188 assert `alpha.x === shared.x`. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 146-188 | T5 | Tests upstream policy and an upstream re-export identity. | Delete. | None |
| 2 | 10-145 | T3 | Pure-function unit tests of a policy whose Alpha-specific inputs (30 days, limits, labels) are visible in the Trash journeys. | Delete; ensure `journeys/notes.spec.ts` keeps one clock-driven case: 30 days left -> 1 day left -> "Deleting permanently" -> purged. | Low |

## Proposed end state
Deleted with its shim entry. The 30-day boundary is asserted once in the Notes journey with `page.clock`.
