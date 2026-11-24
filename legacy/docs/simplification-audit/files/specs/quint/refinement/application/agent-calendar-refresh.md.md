# specs/quint/refinement/application/agent-calendar-refresh.md
- Lines: 22 | Kind: narrative note for one harness | Verdict: DELETE
- Covers: describes `AgentCalendarRefresh` "retained legacy review", "237 checkpoints in 25 schedules", "controlled provider and preservation promises". Duplicates: harness `assumptions`. Callers/importers: none. (`test/quint-agent-calendar-refresh.test.mjs:9-13` asserts the same exact counts — research §2.8.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5, 11 | A1 | "retained legacy review" / "preservation promises" describe the deleted legacy Calendar preservation (D1). | Delete. | None |
| 2 | 9 | §2.15 / B5 | Exact counts, duplicated as exact assertions in the wrapper test. | Delete here; relax the wrapper to `> 0`. | None |

## Proposed end state
File removed.
