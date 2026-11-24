# test/browser/scan-event.spec.ts
- Lines: 44 | Kind: test 1 is a Playwright journey (`chromium`, `?mode=dev`, fake `getUserMedia`, real local OCR); tests 2-4 mount `createScanEventReview` in a bare `<dialog>` (T6 component harness); 4 tests | Verdict: **MERGE** into `journeys/camera-photos.spec.ts` (Scan → Calendar step); tests 2-4 become steps of that journey
- Covers: Camera → "Scan this" → OCR review → Create event draft (title, date, time, location, 90 min duration) → Review in Calendar. Nothing is persisted before Calendar Save, and the saved event survives reload. The review rejects a nonexistent DST time, and an ambiguous numeric date, zone abbreviation or conflicting weekday leaves the date and time blank, writes notes, and writes no draft until they are entered. Duplicates: upstream `vendor/eliza/plugins/plugin-files/test/scan-event.test.mjs` covers the parsing rules (ambiguous numeric dates, zone abbreviations, nonexistent zoned times: lines 12, 315, 416, 423). Callers/importers: none. It imports `helpers/browser-calendar` (`openBrowserCalendar`) and `app-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15, 17 | T6 | Persistence is checked by importing `/src/browser/calendar-store.ts` and reading `calendarDocument.readRaw()`. | Assert in the UI: the event is absent from the Calendar list before Save and present after reload. | Low |
| 2 | 20-24, 28-42 | T6 / T4 | Tests 2-4 build the event review component directly with injected callbacks. Their parsing is already covered upstream. | Rewrite as steps of the journey. The scanned-text box is editable, so fill it with each poster text, open "Create event draft", and assert blank fields, notes, and no handoff until filled. Keep one ambiguous case and the DST case. | Low |
| 3 | 11 | – | `openBrowserCalendar` then `returnToApps` only warms Calendar. | Drop if Calendar opens on handoff without it, otherwise keep as a harness step. | none |
| 4 | 12 | T8 | `toBeEnabled({timeout:60000})` waits for real Tesseract OCR. That is a notable cost (~10-30 s). | Keep one real OCR run in the Scan section (shared with `scan-searchable`). Use `stubOcr` for the other steps. | none |
| 5 | 44 | – | `test.use({timezoneId:'America/New_York'})` sits at the bottom. | Move to the describe. | none |

## Proposed end state
A "scan to Calendar" test in the Scan section: Camera scan, review text, event draft, edit, Review in Calendar, nothing
saved, Save, reload, saved. A second test uses `stubOcr`. It edits the scanned text to an ambiguous date and leaves the
fields blank with notes and no handoff, then enters a nonexistent DST time, which is rejected, then a valid one, which is
handed off. There is no component mounting and no raw store reads.
