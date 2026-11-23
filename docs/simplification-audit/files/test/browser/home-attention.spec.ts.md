# test/browser/home-attention.spec.ts
- Lines: 100 | Kind: Playwright spec (chromium, dev server) mixing UI journey with in-page module imports | Verdict: MERGE into `journeys/home-shell.spec.ts` (Home overview section) — 2 of 5 cases
- Covers: Home attention card opens Inbox and the unread count follows reading/archive/delete through reload; calendar card disappears on a failed read and recovers; a retained brief sits next to the attention card. Duplicates: test 2 (lines 27-54) is a near-verbatim copy of `home-daily-overview.spec.ts:81-112`; test 3 (56-71) duplicates `home-daily-overview.spec.ts:213-223` and the same helper; tests 4-5 overlap `home-daily-overview.spec.ts:339-399` (brief card, missed-only records). Callers/importers: chromium project; imports `app-navigation`, `helpers/browser-calendar`, `helpers/home-calendar`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | A7 | Imports `calendarUnavailable`, `failBrowserCalendarReads`, `restoreBrowserCalendarReads` and never uses them. | Remove (moot once merged). | — |
| 2 | 27-54 | T4 / T6 | Monkey-patches `BrowserCalendar.prototype.list` in the page through `import('/src/browser/calendar.ts')` and dispatches `alpha:calendar-preferences`; same scenario as `home-daily-overview.spec.ts:81-112`. | Delete here; keep one "failed calendar read hides the card, opening Calendar retries" case, using a harness fault-injection helper instead of prototype patching. | Low |
| 3 | 56-71 | T4 | Agent Calendar failure + explicit retry duplicates `home-daily-overview.spec.ts:213-223`. | Delete here. | Low |
| 4 | 75-100 | T6 / T4 | Brief cases seed results via `import('/src/runtime/hosted-digests.ts').rememberRetainedDigests` (a backdoor) and overlap the overview brief test and `home-brief-result.production.spec.ts`, which delivers results the real way. | Keep only the layout claim "brief follows the attention card in the same row" as one assertion in the overview brief case; drop the rest. | Low |
| 5 | 10-25 | — | Unique: attention count ignores archived/deleted rows and clears after reading, through reload, on the dev Inbox (`alpha.dev.app.inbox`). | Carry into the Home overview section. | — |

## Proposed end state
Only test 1 survives as a case in `journeys/home-shell.spec.ts` ("Home attention opens Inbox and the count follows reading through reload"), plus one row-order assertion folded into the brief case. File deleted.
