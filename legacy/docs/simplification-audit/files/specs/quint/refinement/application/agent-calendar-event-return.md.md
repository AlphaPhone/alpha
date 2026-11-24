# specs/quint/refinement/application/agent-calendar-event-return.md
- Lines: 25 | Kind: narrative note for one harness | Verdict: DELETE (fold 2 lines into the harness header)
- Covers: explains `AgentCalendarEventReturn` and states "38 schedules … 203 checkpoints". Duplicates: the harness `assumptions` strings (lines 316-320 of the `.mjs`) say the same. Callers/importers: none (only self-mention; the `.mjs` does not read it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | §2.15 / B5 | Exact schedule/checkpoint counts go stale on every scenario edit (the case list now yields a different count). | Delete. | None |
| 2 | 19-21 | A1 | "legacy native event returns" — legacy readers are being deleted (D1). | Delete. | None |
| 3 | 23-25 | P1 | Run command points at the per-model wrapper that is being merged into one runner. | Delete. | None |

## Proposed end state
File removed; a two-line header comment in `agent-calendar-event-return.mjs` says what is replayed and against which model.
