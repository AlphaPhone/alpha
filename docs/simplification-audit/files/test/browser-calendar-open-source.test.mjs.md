# test/browser-calendar-open-source.test.mjs
- Lines: 40 | Kind: transplant (slices `agent-calendar-adapter.ts` `browserCalendarScope`, `browser-adapter.ts` `openBrowserView`, and the `openView` wrapper in `data-adapter.ts`; runs them with `new Function`) | Verdict: DELETE
- Covers: a Calendar link from the dev browser host keeps the `browser-local` calendar source only in test-mocks web builds; other views never receive a calendar source; Calendar still opens when its source list throws. Duplicates: `test/browser/one-calendar.spec.ts` and `dev-calendar-*.spec.ts` open Calendar for real. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13, 28-35 | T2 | Three anchor slices, including `"  window.addEventListener('alpha:browser-open-view'"` and `'  const empty:'`. | Delete. | — |
| 2 | 19 | A1 | Iterates `{authority:'legacy'}`, the legacy calendar authority deleted under D1/C2. | Gone with the file. | — |
| 3 | 10-25 | D5, A5 | `browserCalendarScope` is test-mocks-only (`testMocksEnabled&&...getPlatform()==='web'`), so this protects a dev surface. | Not carried; the dev Calendar specs already open Calendar in that mode. | Low |
| 4 | 27-40 | B1 | Asserts that `data-adapter.ts`'s `openView` wrapper swallows a throwing `displaySources()` or `retry()`. That is a defensive catch around our own view model (B1/B2). | Report to the `data-adapter.ts` reviewer: decide whether the catch is specified; if yes, a journey case "Calendar opens when its source list fails"; if not, delete the catch. | Low |

## Proposed end state
File deleted. No replacement unless the owner keeps the `displaySources` fallback, in which case it becomes one case in `journeys/calendar.spec.ts`.
