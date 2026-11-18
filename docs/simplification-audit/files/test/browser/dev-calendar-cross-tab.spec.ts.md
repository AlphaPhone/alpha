# test/browser/dev-calendar-cross-tab.spec.ts
- Lines: 12 | Kind: two-tab test of the browser calendar stand-in (P7/P1), chromium dev build | Verdict: **DELETE**
- Covers: when another tab changes a daily series, an occurrence editor open in the first tab refuses to save ("This event changed") and both tabs keep the other tab's version. Duplicates: `dev-calendar-editor.spec.ts:9-11` (same "This event changed" refusal from a concurrent write). Callers/importers: none. 1 test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 9, 11 | P7 / T6 | Seeds, edits and reads through `registerPlugin('AlphaCalendar')` and `calendarDocument.readRaw()`; the editor is the stand-in's own dialog. | Delete. | Low: two-tab concurrency is a desktop-browser concern; the APK has one WebView. |
| 2 | — | T4 | The stale-save refusal is also in `dev-calendar-editor`. | — | none |

## Proposed end state
File removed.
