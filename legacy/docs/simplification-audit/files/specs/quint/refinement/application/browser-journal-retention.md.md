# specs/quint/refinement/application/browser-journal-retention.md
- Lines: 35 | Kind: model/harness note (documentation) | Verdict: KEEP (edit)
- Covers: explains retention limits (200 definite receipts, 30 days, 127 settled deletions) and which source each checkpoint executes. Duplicates: `specs/quint/application/README.md` row. Callers/importers: none (docs).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 30-33 | A1 / A8 | "Missing timestamps sort at zero and are age-exempt" and "Older builds could leave a Reminder with `pendingDeletion` … `__proto__`" describe legacy data (journal-retention.ts:12-13 "predate this policy", B171; orphan markers). Under D1 neither can exist. | Remove both once the legacy readers go; keep the current-limit description. | L |
| 2 | 35 | T9 | Run command names the per-model wrapper. | Keep in sync with the lane layout. | L |

## Proposed end state
A 20-line note: limits, ordering rules, checkpoint→source table. No history.
