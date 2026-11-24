# specs/quint/refinement/legacy/calendar-navigation.md
- Lines: 20 | Kind: formal documentation (historical comparison) | Verdict: DELETE
- Covers: explains the historical `Calendar` model comparison in `calendar-navigation.mjs`. Duplicates: none. Callers: none (doc); referenced command runs `test/quint-historical-calendar-navigation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / D11 | Documents a comparison against the unchanged *proposed historical* `specs/quint/legacy/Calendar.qnt` design, not a live model. D11 retires `specs/quint/legacy`. | Delete with `calendar-navigation.mjs` and the legacy family. | None |

## Proposed end state
Deleted.
