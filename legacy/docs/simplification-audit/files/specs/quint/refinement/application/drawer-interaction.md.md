# specs/quint/refinement/application/drawer-interaction.md
- Lines: 24 | Kind: prose note for a refinement campaign | Verdict: MERGE into `drawer-interaction.mjs` header comment (3-4 lines), then delete
- Covers: describes scope and exclusions of the DrawerInteraction campaign. Duplicates: the harness `assumptions` array (`drawer-interaction.mjs:94-98`) says the same. Callers/importers: none (`git grep drawer-interaction.md` = 0 hits outside the audit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | B5 | Hard-codes "134 checkpoints in 22 schedules"; every schedule edit makes it stale. | Drop counts. | Low |
| 2 | 22-24 | – | Run command duplicates the test file name. | Drop. | – |

## Proposed end state
No `.md`; one short header comment in the harness naming what is real (adapter, drawer, DOM, React) and what is a port.
