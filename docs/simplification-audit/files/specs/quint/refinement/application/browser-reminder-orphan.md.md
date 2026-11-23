# specs/quint/refinement/application/browser-reminder-orphan.md
- Lines: 43 | Kind: model/harness note | Verdict: DELETE
- Covers: describes the historical `__proto__` staging bug (commit `b0eb3684…`) and how orphaned `pendingDeletion` markers behave. Duplicates: none. Callers/importers: none (linked from nothing but itself).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-43 | A1 / A8 | Documents a data shape only an older build could write; the renamed package starts empty (D1). | Delete with `browser-reminder-orphan.mjs` and `BrowserReminderOrphan.qnt`. | L |

## Proposed end state
Removed.
