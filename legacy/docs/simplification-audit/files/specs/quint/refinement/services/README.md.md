# specs/quint/refinement/services/README.md
- Lines: 47 | Kind: narrative doc | Verdict: DELETE (fold two lines into `specs/quint/README.md`)
- Covers: describes `runServicesRefinement()` as "fourteen receipts" and "55 bounded schedules" with a 14-row table and two run commands. Duplicates: the `obligations` list in `index.mjs` (the authoritative copy of the same "remaining boundary" text). Callers: none (`git grep "refinement/services/README"` finds nothing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-8 | A8 / §2.15 | Stale counts: `index.mjs` now registers ~70 campaigns (forward replays, 9 local-source checks, ~25 `withDriver` checks, 11 direct runners), not 14. | Delete. | None |
| 2 | 16 | A8 | Row `CalendarSync` says "Durable outbox, competing claims, Undo..." is executed; its harness `calendar.mjs` was deleted (stage A1, D4), so the claim is false. | Delete (and remove the same obligation row at `index.mjs:138`). | None |
| 3 | 32-36 | A8 | Changelog narrative ("The earlier expected-violation scenario has been retired"). | Delete. | None |
| 4 | 38-41 | T4 | Run commands point at `test/quint-services-refinement.test.mjs` (verdict DELETE, T4) and `test/quint-scan-conformance.test.mjs`. | Replace with the single runner command in `specs/quint/README.md`. | None |

## Proposed end state
File removed. `specs/quint/README.md` says once how to run one family's refinement campaigns; per-model limits live only in `index.mjs` obligations.
