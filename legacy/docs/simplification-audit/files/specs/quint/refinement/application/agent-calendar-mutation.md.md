# specs/quint/refinement/application/agent-calendar-mutation.md
- Lines: 25 | Kind: narrative note for one harness | Verdict: DELETE
- Covers: describes `AgentCalendarMutation` create/update/delete admission "and the current preservation read", "134 checkpoints in 24 schedules". Duplicates: harness `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 11-13 | A1 | Describes the legacy Calendar preservation read / "changed preservation", deleted in this worktree (D1). Now false. | Delete. | None |
| 2 | 9 | §2.15 | Exact counts, stale. | Delete. | None |

## Proposed end state
File removed; the harness header carries one sentence of purpose.
