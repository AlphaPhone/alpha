# specs/quint/refinement/application/google-calendar-link-flow.md
- Lines: 25 | Kind: prose note for a refinement campaign | Verdict: MERGE into `google-calendar-link-flow.mjs` header, then delete
- Covers: scope of `GoogleCalendarLinkFlow`. Duplicates: harness `assumptions` (lines 313-316). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | B5 | "205 checkpoints across 42 schedules". | Drop counts. | – |
| 2 | 19-20 | – | Points to `AgentCalendarSyncControl` for the control client; worth one line in the header. | Keep that sentence. | – |

## Proposed end state
No `.md`; two header lines in the harness.
