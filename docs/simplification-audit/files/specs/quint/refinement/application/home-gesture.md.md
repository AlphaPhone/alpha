# specs/quint/refinement/application/home-gesture.md
- Lines: 25 | Kind: harness documentation | Verdict: MERGE into the header comment of `home-gesture.mjs`
- Covers: prose description of the HomeGesture campaign. Duplicates: harness `assumptions`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-15 | — | "The Chromium cases also exercise the Home renderer with native bridge fixtures" — `home-gesture.mjs` launches no browser; the claim is stale or refers to unnamed Playwright specs. | Drop, or name the spec if one exists. | L: misleading evidence claim. |
| 2 | 9 | B5 | Counts (114 checkpoints / 20 schedules) duplicated in the wrapper. | Drop. | — |
| 3 | 23-25 | T9 | Run instruction for the per-model wrapper. | Drop. | — |

## Proposed end state
Short JSDoc header in `home-gesture.mjs`; this file deleted.
