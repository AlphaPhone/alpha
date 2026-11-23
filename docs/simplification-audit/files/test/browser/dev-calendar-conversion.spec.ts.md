# test/browser/dev-calendar-conversion.spec.ts
- Lines: 40 | Kind: Playwright on the browser calendar editor dialog opened via `registerPlugin('AlphaCalendar').edit` (P7), chromium dev build | Verdict: **DELETE**
- Covers: the browser development calendar's "Edit calendar event" dialog (`apps/app/src/browser/calendar-editor.ts`) converts timed ↔ all-day using the displayed civil day, keeps unsaved timed values on a toggle round trip, uses an exclusive midnight end, preserves dates across a DST change, and a save cancelled while waiting for the storage lock changes nothing. Duplicates: `dev-calendar-editor.spec.ts` (same dialog, stale/cancel), `calendar-form-controls.spec.ts` (product Calendar form). Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-13 | P7 / P2 | Opens the stand-in's own editor through the plugin API; that dialog does not exist on Android (native `AlphaCalendarPlugin` extends the upstream plugin). | Delete. | Low for the APK. |
| 2 | 8 | A1 | Seeds the legacy `{version:1, legacy, value}` envelope via `browserDocuments.edit`. | — | none |
| 3 | 35, 39 | P3 | Holds the Web Lock of the browser document store to simulate a slow save. | — | none |
| 4 | 14, 19-20, 31 | P2 | Results read through `calendarDocument.readRaw()`. | — | none |

## Proposed end state
File removed. Civil-day / DST conversion in the product's canonical editor (`canonical-calendar-drafts.ts` uses `browser/calendar-time.ts`) is covered by the canonical Calendar form journey; if it is not, add one DST case there.
