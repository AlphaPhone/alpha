# test/quint-day-anchor.test.mjs
- Lines: 45 | Kind: Quint replay wrapper (`checkDayAnchor` from `specs/quint/refinement/application/day-anchor.mjs`) + a source-mutation canary + one scenario on the esbuild-built calendar adapter fixture | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the three calendar draft adapters keep the day anchor across form open/close, midnight, refresh and remount (40 traces). Duplicates: none for the replay (`day-anchor.mjs` is not in the application index); case 3 overlaps `test/browser/calendar-*.spec.ts` midnight cases. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T4 (none) | Only execution of `DayAnchor`. | Register `checkDayAnchor` in the application index. | Low |
| 2 | 11-12 | T1 | Asserts the receipt lists three literal source paths; C5 merges the three calendar draft adapters, which will fail this. | Drop. | Medium |
| 3 | 15-21 | T5, T10 | Canary rewrites the exact text `this.calendarEditDraftIdentity = void 0;\n      return;` and expects failure. Breaks on Prettier (D9) or the adapter merge. | Delete. | Medium |
| 4 | 23-45 | — | Concrete scenario (editor closed before midnight, reopened after) on the compiled adapter: real behaviour. | Add as a named trace to the DayAnchor model/driver, or as a step in `journeys/calendar.spec.ts`. | Low |

## Proposed end state
Deleted. `DayAnchor` is in the application index; the midnight scenario lives as a named model scenario; no canary.
