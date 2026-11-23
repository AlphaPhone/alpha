# test/browser/web-summary-note.spec.ts
- Lines: 51 | Kind: Playwright spec, chromium, 9 tests (theme loop); real UI with routed pages, some backdoors | Verdict: MERGE into `journeys/notes.spec.ts` (sources section) and `journeys/browser.spec.ts` (Ask about page)
- Covers: Browser "Ask about page" puts a reviewed excerpt into chat, the reply's "Review summary note" saves a note with a durable web source that reopens the page; switching the agent session refuses Save; sensitive pages and pasted secrets are refused; CORS failure allows paste; Home or a document change retires a pending question; compact source review keeps actions reachable and Remove web source drops only the link. Duplicates: Ask-about-page refusal also in `workflow-notice-taps.spec.ts` (`ask-sensitive`) and `gmail-notice-question.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 8, 15, 43 | A1 | Every test opens Notes through `openLegacyNotes` ("Previous notes"), deleted with A2. | Rebase on the current Notes view. | Breaks when A2 lands. |
| 2 | 40 | T6 | Second half of test 6 imports `webSourceOf` from `/src/prototype/summary-source.ts` and checks six URLs. | Delete that half (unit check); keep the UI "Remove secrets first" half. | Low: URL policy loses its only browser check; a node test of `summary-source.ts` would be a unit test (owner rule says no). |
| 3 | 23 | T6 | Session switch is faked by wrapping `connectionController.getSnapshot`. | Switch the development profile through Settings diagnostics (real path) while the review is open. | Low. |
| 4 | 43 | T6/T7 | Compact test seeds a long web source via `browserNotesPort.compareExchange` and sets text scale via `BrowserDevice.prototype.setTextScale`, run in light and dark. | Create the source through the summary flow with a long URL route; set text scale through Settings or `harness/text-scale.ts`; one theme. | Low. |
| 5 | 47-50 | T6 | Document-identity change uses `registerPlugin('AlphaBrowser').navigate` from the page. | Navigate with the address bar while the fetch is held. | Low. |
| 6 | 33-37 | T4 | CORS-paste+Home and Home-while-fetching are two variants of "Home retires the question". | One step with the held fetch. | None. |
| 7 | 11 | T6 | `notes()` reads the raw notes document. | Assert the visible note list and note source dialog. | Low. |

## Proposed end state
`journeys/notes.spec.ts` sources step: ask about a routed page, send, review summary, save, reload, open the note's web
source, open the page; agent switch while reviewing refuses Save. `journeys/browser.spec.ts` Ask-about-page step:
sensitive page refused, pasted secret refused, Home during a held fetch closes the question, address-bar navigation
retires it. Needs `harness/nav.ts`, `harness/connection.ts` (dev profile). File deleted.
