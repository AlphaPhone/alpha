# specs/quint/legacy/home-layout/README.md
- Lines: 34 | Kind: narrative doc for a historical Quint refinement campaign | Verdict: DELETE
- Covers: prose for `check-home-layout-refinement.mjs` (mounted Home schedule, HOME role decline/grant, inset arrival, four historical mismatch receipts) and the command for `test/quint-legacy-home-layout-refinement.test.mjs`. Duplicates: the harness `assumptions` strings (`check-home-layout-refinement.mjs:422-427`). Callers/importers: none (`git grep "home-layout/README"` finds nothing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-34 | P6 / A8 | Describes a historical design comparison (`HomeLayout.qnt`, source `ef9fbf7cd7`) that D11 retires. Lines 20-27 record that the "owner-approved renderer now hides empty cards", i.e. the model is already known to be wrong about current behaviour. | Delete with harness, model and test. | None |
| 2 | 13-15 | A8 | "original absolute pixel constants are kept in the model" — history narration. | Delete. | None |

## Proposed end state
Deleted together with `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs`, `legacy/HomeLayout.qnt`,
`test/fixtures/quint/HomeLayoutComparison.qnt` and `test/quint-legacy-home-layout-refinement.test.mjs`. Still-wanted
Home behaviours are listed in the harness report as `journeys/home-shell.spec.ts` cases.
