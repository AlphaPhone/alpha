# test/browser/helpers/home-calendar.ts
- Lines: 37 | Kind: Playwright fixture (read-only CalendarService port for Home) | Verdict: **MERGE** into `harness/plugins/calendar.ts`
- Covers: Home's next-event card over a read-only calendar port, with `include`/`fail` toggles and re-read on `alpha:canonical-calendar-invalidated`. Duplicates: `canonical-calendar.ts`, `one-calendar.ts` (same record shapes). Callers/importers: 9 specs (`accessibility-resilience`, `accessibility-states.ts`, `full-chat-grabber`, `home-attention`, `home-calendar-density`, `home-daily-overview`, `large-text-overlap`, `message-actions`, `shaw-ui-fixtures`) and `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-10, 28 | T6, P2 | Preloads and imports `connection-ui.tsx`, replaces `getAppRecordClient`. | Bridge `Agent.request` handler from the merged fixture. | Low. |
| 2 | 30, 36 | T6 | Dispatches the product's internal `alpha:canonical-calendar-invalidated` event to force a re-read. | Acceptable as the fixture's "server changed" signal only if the product listens to a push; otherwise re-open Home. | Low. |
| 3 | 13, 24 | D8 | 600-character lines. | Formatter. | none |

## Proposed end state
One calendar fixture (see `canonical-calendar.ts.md`) with `fail` and `include` options; `refreshHomeCalendar` becomes
`calendar.update({...})`. The legacy Quint home-layout harness keeps its import until P6.
