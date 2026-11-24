# specs/quint/refinement/services/inbox-list-paging-ports.mjs
- Lines: 58 | Kind: transplant fixture (copies `inbox-coordinator-ports.mjs` text with string replacements, and injects an observer into `apps/app/src/prototype/inbox-cloud-adapter.ts` at a source marker) | Verdict: PORT
- Covers: exposes the Inbox list closure state (`load`, `setFolder`, `selectAccount`, `refreshAccounts`, `rememberList`, `restoreList`, `invalidateList`, `cancelOperation` and 14 private variables) for `inbox-list-paging.mjs`. Importers: `inbox-list-paging.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-15 | T10 | Reads `inbox-coordinator-ports.mjs` as text and replaces four literals (`from "esbuild"`, `import { readdirSync } from "node:fs";`, the `const root = ...` line, the `plugins: [{ name: "controlled-inbox-ports", setup(builder) {` line), each asserted unique, then writes a temp copy and imports it. Any edit to the fixture breaks it. | Delete; the fixture should accept an optional esbuild `onLoad` plugin parameter instead. | Low |
| 2 | 16-19 | T2 / T10 | Inserts `globalThis.__inboxPaging={...}` after the marker `'  let loadingMore = false;'` in `inbox-cloud-adapter.ts` (line 557 today) to read closure-private state. Reformatting or the planned `model.js`/adapter split breaks it. | Product change: extract the list/paging state into an exported module (e.g. `apps/app/src/runtime/inbox-list.ts` exporting `createInboxList({client, ...})` with `load`, `setFolder`, `selectAccount`, `refreshAccounts`, `remember`/`restore`/`invalidate`, `cancel`, `snapshot()`), used by the adapter; the harness imports and drives that. | Medium |
| 3 | 23-35 | D2 | Fake `Shell` class duplicated from `inbox-coordinator-ports.mjs` `mount()`. | Gone after the extraction. | Low |
| 4 | 33 | — | Comment explains why account discovery runs inactive: keep the explanation in the ported fixture. | — | — |

## Proposed end state
File removed. `inbox-list-paging.mjs` imports `createInboxList` from the product with fake client/storage ports; no text copies, no markers.
