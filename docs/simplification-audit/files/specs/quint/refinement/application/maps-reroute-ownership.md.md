# specs/quint/refinement/application/maps-reroute-ownership.md
- Lines: 37 | Kind: harness documentation | Verdict: MERGE (trimmed) into the header comment of `maps-reroute-ownership.mjs`
- Covers: prose for the mounted Maps reroute replay and the fixed bug. Duplicates: harness `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | A8 | "The original mounted behavior returned success…" narrates the pre-fix bug. | Delete; the schedules are the regression evidence. | — |
| 2 | 17-28 | — | Current contract (receipt revision, live session check, refused reroute keeps route) is useful. | Keep 3-4 lines in the header. | — |
| 3 | 32-37 | — | Android task-removal boundary note belongs with the native model, not here. | Drop or move. | — |

## Proposed end state
Short header comment; file deleted.
