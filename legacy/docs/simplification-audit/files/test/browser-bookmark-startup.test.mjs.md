# test/browser-bookmark-startup.test.mjs
- Lines: 87 | Kind: transplant (slices `browser-adapter.ts` from `  let bookmarkRead:` to `  function saveBookmark(`, strips types with `node:module`, runs in `vm`) | Verdict: DELETE
- Covers: a startup bookmark read that fails as "unimplemented" is silent outside Browser and reported inside it; a foreground request shares the in-flight read and is not demoted by a background one; a failed read never erases bookmarks. Duplicates: none direct. Bookmarks are exercised in `journey-core-loops.production.spec.ts`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-12 | T2 | Text slice by two anchors; the fragment closes over `shell`, `Browser`, `report`, `refresh`, `session` supplied as fake globals. | Delete. | — |
| 2 | 8 | T9 | `ALPHA_BROWSER_ADAPTER_SOURCE`: five test files read it, nothing sets it. | Gone with the file (and remove from the other four when they go). | — |
| 3 | 4 | C7 | Uses `node:module` `stripTypeScriptTypes` while 219 other files use `test/support/strip-types.mjs`. | Gone with the file. | — |
| 4 | 39-87 | — | Worth carrying to `journeys/browser.spec.ts` with the Browser bridge fake: "a failing bookmark read at startup shows nothing on Home and an error inside Browser; saved bookmarks stay". | REWRITE as one journey. | Low |

## Proposed end state
File deleted. One case in `journeys/browser.spec.ts`. The coalescing detail is internal and not carried.
