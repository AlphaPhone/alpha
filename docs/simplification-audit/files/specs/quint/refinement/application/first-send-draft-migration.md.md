# specs/quint/refinement/application/first-send-draft-migration.md
- Lines: 27 | Kind: prose note for a refinement campaign | Verdict: MERGE into `first-send-draft-migration.mjs` header, then delete
- Covers: the first-send draft hand-off from the "no conversation yet" slot to the selected conversation (a live runtime flow, not a legacy data migration; D1 does not apply). Duplicates: harness `assumptions` (`first-send-draft-migration.mjs:95-97`). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | A8 | "At baseline `6108e927db`, a held source read could outlive the shell" (history). | Drop. | Low |
| 2 | 23-27 | – | The known gap (destination change after confirmation can lose the only copy) is worth keeping as one sentence. | Move into the harness header or the model comment. | – |

## Proposed end state
No `.md`; a three-line header in the harness including the cross-slot atomicity gap.
