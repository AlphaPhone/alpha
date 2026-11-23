# test/browser/dev-calendar-editor.spec.ts
- Lines: 11 | Kind: Playwright on the browser calendar stand-in's editor (P7), chromium dev build | Verdict: **DELETE**
- Covers: the browser development calendar's complex editor keeps all-day, multi-day and overlapping dates when the title/end changes, and rejects a nonexistent DST time and a stale save, and Cancel leaves the event unchanged. Duplicates: `dev-calendar-conversion.spec.ts`, `dev-calendar-cross-tab.spec.ts`. Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | P7 | The dialog is `apps/app/src/browser/calendar-editor.ts`, a development stand-in for the native calendar editor. | Delete. | Low. |
| 2 | 7 | P2 | Opens Calendar via `openBrowserCalendar` (React-fiber backdoor forcing `calendarAuthority:'browser-local'`). | — | none |
| 3 | 6, 10 | B4 / P2 | Double `getItem` guard on seeding; direct `calendarDocument.edit` to simulate another tab. | — | none |
| 4 | 7 | B5 | Screenshot for one mode only, unused. | — | none |
| 5 | 7, 10 | D8 | Entire tests on single 1,000+-character lines. | — | none |

## Proposed end state
File removed.
