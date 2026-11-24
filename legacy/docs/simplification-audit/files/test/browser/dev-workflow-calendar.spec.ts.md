# test/browser/dev-workflow-calendar.spec.ts
- Lines: 14 (6.9 KB) | Kind: Playwright, chromium; local workflow simulator Calendar read + module-in-page tests of `workflowCalendarRange` | Verdict: DELETE
- Covers: simulator "Calendar next 3 days" / today / tomorrow / week ranges across DST and UTC+14, meeting conditions, truncated calendar input. Duplicates: none (the range code is only imported by the simulator: `browser/workflow-calendar.ts` ← `simulated-workflows.ts`, `workflow-dated-sources.ts`). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 13 | T6 | `workflowCalendarRange` imported and called in-page: unit tests of a dev-only helper. | Delete. | None for product. |
| 2 | 12 | P3 | `BrowserCalendar.prototype.list` replaced to return `truncated:true`. | Delete. | None. |
| 3 | 5-9, 11, 14 | P7 | Calendar events seeded through `registerPlugin('AlphaCalendar').save` in-page, then the simulator runs. | Delete with the simulator. | Low. |
| 4 | 2, 14 | — | Good timezone technique (`test.use({timezoneId})`); reuse it in `journeys/calendar.spec.ts` for product DST rules. | — | — |

## Proposed end state
Deleted with the simulator and `browser/workflow-calendar.ts`.
