# specs/quint/legacy/core/fact-write-dedupe-refinement.md
- Lines: 100 | Kind: formal-spec documentation (legacy) | Verdict: DELETE; MERGE the "Separate current-source model" section (lines 79-100) into the live services docs
- Covers: explains the `CoreFactWriteDedupe` legacy replay (upstream `createMemory` facts path) and, in its second half, the live `services/FactWriteScope.qnt` model and `refinement/services/fact-write-scope.mjs`.
- Duplicates: none for the live half. Callers/importers: linked from nothing (`git grep fact-write-dedupe-refinement.md` = no hits outside the audit); it is prose only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-77 | P6 | Describes a historical upstream-TLA replay, SDK pin `99b49439…`, and Android bundle facts that will be stale once legacy is retired. | Delete. | None |
| 2 | 79-100 | — | Only documentation of the live `FactWriteScope` model and its source replay boundaries (119/120 candidate window, instance/room lanes). | Move to a short README beside `specs/quint/services/FactWriteScope.qnt` or a header comment in `refinement/services/fact-write-scope.mjs`. | Low |
| 3 | — | P6 | Note: live `refinement/services/fact-write-scope.mjs:6,11` imports `legacy/core/check-fact-write-dedupe-refinement.mjs` (not in this chunk). That import must be cut (move the shared fixture) before the legacy tree goes. | Cross-file action. | Medium |

## Proposed end state
File gone; ~20 lines on FactWriteScope live next to that model.
