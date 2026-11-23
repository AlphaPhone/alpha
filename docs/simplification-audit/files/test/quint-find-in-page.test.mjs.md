# test/quint-find-in-page.test.mjs
- Lines: 11 | Kind: Quint replay wrapper (`checkFindInPage`, `specs/quint/refinement/application/find-in-page.mjs`; driver strips and slices `prototype/browser-adapter.ts` into `vm`) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the Browser find bar (open/close, typing, timer, native result, tab close) follows 49 FindInPage traces. Duplicates: browser find-in-page Playwright cases (`journeys/browser.spec.ts` target). Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | T4 (none) | Only execution; not in the application index. | Register. | Low |
| 2 | 7-10 | B5 | Exact trace count, checkpoint floor, 10 action counters. | Drop. | None |
| 3 | — | T10 | Driver slices `browser-adapter.ts`. | PORT: export the find-bar controller (`views/browser/find.ts`) and import it. | Medium |

## Proposed end state
Deleted; the driver imports an exported find controller and runs from the application index.
