# test/browser/dev-calendar-recurring-assistant.spec.ts
- Lines: 131 | Kind: Playwright journey over an inline paired-local-agent bridge (same as `dev-calendar-assistant`), chromium dev build | Verdict: **MERGE** with `dev-calendar-assistant.spec.ts` into the "assistant Calendar action" cases of `journeys/calendar.spec.ts`
- Covers: assistant actions on one occurrence of a daily series: the selected object is the occurrence (`:occ:` id); the review says "This occurrence only"; read shares only that occurrence; update detaches one occurrence (two rows, `seriesId` kept); delete excludes that date after the Undo window; cancel and a stale series (changed under the review) fail without writing; replaying the operation does not apply it twice. Duplicates: `dev-calendar-assistant.spec.ts` (lines 12-78 identical), `dev-calendar-series.spec.ts` (agent occurrence mutation). Callers/importers: none. 5 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-78 | C5 / T4 | 66-line fixture copied verbatim from `dev-calendar-assistant.spec.ts`. | One agent-plugin option set. | none |
| 2 | 46-47, 80-86 | A3 (C4) | Local-agent pairing connection (deleted product path). | Resident harness. | Medium. |
| 3 | 3, 101 | P15 | Node import of `device-record-presentation.ts`. | Literal title. | none |
| 4 | 106 | P2 | Stale case mutates `calendarDocument` directly. | Change the series through the visible editor in a second step, or through the bridge seed API. | Low. |
| 5 | 125-126 | P2 / T6 | Calls `AlphaCalendar.list` and `executeAgent` directly to prove no double application. | Replace with "reload; Activity shows one receipt; the Calendar shows the same rows". | Medium: the redispatch refusal is otherwise untested in e2e. |
| 6 | 113-114 | P2 | `Capacitor.nativePromise('AlphaActionJournal','recoverDeletion')` direct call. | Reload-based assertion. | Low. |

## Proposed end state
Recurring rows (read, update, delete, cancel, stale) join the assistant-action table in `journeys/calendar.spec.ts` with a `repeat:'daily'` seed; assertions on the visible review ("This occurrence only"), visible rows after reload, and recorded requests.
