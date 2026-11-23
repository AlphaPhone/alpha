# specs/quint/refinement/application/permission-coordinator-notes.md
- Lines: 7 | Kind: harness documentation | Verdict: MERGE into the header of `permission-choices.mjs`, then delete
- Covers: describes the PermissionChoices coordinator replay.
- Duplicates: the harness `assumptions`/`obligations` arrays. Referenced by `specs/quint/refinement/application/README.md:71`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A1, stale | Claims "31 schedules and 192 checkpoints" and "historical four-, five- and six-step completion"; the historical versions are deleted (D1) and the counts drift on every edit. | Drop counts and historical claims; keep 3-4 lines of scope in the harness header. | None. |

## Proposed end state
Removed; README line 71 updated.
