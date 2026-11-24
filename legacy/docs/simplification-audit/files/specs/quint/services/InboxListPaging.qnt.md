# specs/quint/services/InboxListPaging.qnt
- Lines: 133 | Kind: Quint model, live (services manifest, 10 `symbols` pins in `inbox-cloud-adapter.ts`) | Verdict: KEEP; harness PORT
- Covers: Inbox message list paging: one read in flight, cursors used once (a repeated provider cursor ends paging), stale replies for another folder/account dropped, failed page keeps the list, saved list restored and marked (6 runs, 6 invariants, 4 witnesses). Duplicates: none. Callers/importers: manifest; `refinement/services/inbox-list-paging.mjs` + `inbox-list-paging-ports.mjs`; `test/quint-inbox-list-paging.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `inbox-list-paging-ports.mjs:11-22` | T10 | The harness reads `inbox-coordinator-ports.mjs` as **text**, rewrites three of its lines (`from "esbuild"`, the `readdirSync` import, the `root` constant) with exact-match `replace`, writes the result to a temp file and imports it. It also injects an `onLoad` hook that inserts an observer into `apps/app/src/prototype/inbox-cloud-adapter.ts` at the literal anchor `'  let loadingMore = false;'`, exposing closure variables (`generation`, `loadingMore`, `nextPageToken`, `seenCursors`, `folderLists`, `cachedListShown`, …). | PORT: (a) `inbox-coordinator-ports.mjs` exports an `observe` plugin option instead of being text-rewritten; (b) the paging state moves out of the `installInboxCloudAdapter` closure into an exported `createInboxPaging()` (runtime module) whose `inspect()` the harness reads directly. Then delete the anchor injection. | Medium: touches the adapter (D2 adapter rewrite is the natural moment) |
| 2 | manifest `symbols` | T10 | 10 closure-variable names pinned by regex; they exist only because the observer reads them. | Delete with #1. | None |
| 3 | `inbox-list-paging.mjs:34` | B5 | Asserts the generated artifact equals the file it wrote. | Delete. | None |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged. Paging logic exported from a small runtime module that `inbox-cloud-adapter.ts` uses; the harness imports and drives it with the shared Inbox ports; no text rewriting of harness or product files; no symbol pins.
