# test/browser/reading-capability.spec.ts
- Lines: 54 | Kind: Playwright, chromium, real Browser UI with route-fulfilled pages; test 2 forges an `AlphaBrowser.stateChanged` event through an in-page `registerPlugin` import | Verdict: **MERGE** into `journeys/browser.spec.ts` (reading section)
- Covers: the Browser menu offers Read aloud / Ask about page only for a committed embedded page; blank, loading, stopped and external-only pages get neither. Duplicates: test 1 is the same path as `reading-review.spec.ts` test 4 (menu → Read aloud on a fulfilled page); the probe message is also unit-tested in `test/reading-capability-probe.test.mjs` (host test; a DELETE candidate under T3). Android behaviour is `BrowserReadingNavigation` instrumentation. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-18 | T4 | Test 1 duplicates the opening of `reading-review` test 4. | Fold into the reading journey: open page → menu shows Read aloud + Ask about page, no unavailable note. | none |
| 2 | 34-37, 49-52 | T6 | Captures and re-sends a forged `stateChanged` with `externalOnly:true` through the plugin stand-in. | Keep as one step only if the web build has a real external-only provider path; otherwise delete (the native guard is instrumentation-tested). | Low |
| 3 | 19-46 | – | Blank → loading → stopped → reload → loaded sequence is a good user journey with a held route. | Carry. | none |
| 4 | 2-4 | A8 | Comment cross-references a host unit test that the test cleanup deletes. | Drop the reference. | none |

## Proposed end state
Two steps in `journeys/browser.spec.ts`: "reading is offered only for a committed page" (blank, loading, stopped, loaded) and,
optionally, the external-only refusal. No separate spec file.
