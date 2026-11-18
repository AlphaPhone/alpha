# test/browser/browser-external-handoff.spec.ts
- Lines: 59 | Kind: Playwright spec, chromium; component harness: loads `.eliza/client-features/.../tab-host.ts` through `/@fs`, builds `createExternalBrowserHandoff` with a fake shell on a blank routed page (T6) | Verdict: MERGE into `journeys/browser.spec.ts` (carry 3 cases into the production spec), delete the file
- Covers: the handoff factory's private review, duplicate-tap suppression, page-change fence and unavailable-browser refusal. Duplicates: `browser-external-handoff.production.spec.ts` (cancel/approve through the real menu). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 13 | D13/P15 | Imports the generated upstream projection by filesystem path; breaks when `.eliza` is not prepared. | Delete. | None. |
| 2 | 10-31 | T6 | Fake document, fake shell (`S`, `vset`), fake `Browser.openExternalBrowser`; the real Browser UI is never mounted. | Drive the rendered menu on the production stub instead. | Low. |
| 3 | 33-39 | T4 | Private cancellation duplicates the production spec test 2. | Drop. | None. |
| 4 | 40-59 | carry | Duplicate tap sends once; navigation during review blocks the handoff; unavailable handoff reports and restores. | Re-express with the production `AlphaBrowser` stub (emit a second `stateChanged` during the review; make `openExternalBrowser` reject). | Medium. |

## Proposed end state
File deleted; three cases added to the production handoff journey.
