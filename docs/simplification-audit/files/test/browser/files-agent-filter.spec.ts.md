# test/browser/files-agent-filter.spec.ts
- Lines: 39 | Kind: Playwright, chromium. A stitched-source harness (P4): `page.route` rewrites the served `/src/runtime/connection-ui.tsx` and appends `window.__filesTestExecutor=(...args)=>deviceExecutor(...args)`, then calls the private executor directly (T6) | Verdict: **REWRITE in `journeys/files.spec.ts`** (3 cases)
- Covers: agent-issued Files operations from Home. `files_filter` opens Files on its first visit and the row is usable; `files_open` waits for the first Files render and opens the file; `files_folder_create` from Home fails and does not navigate or create. Duplicates: host `test/files-agent-patch.test.mjs`, `files-browser.test.mjs` and `files-picker-lifecycle.test.mjs` cover the executor's operation table. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-7 | P4 | The served product module is rewritten to leak a module-private function. This is a third build of the product and breaks on any rename or split of `connection-ui.tsx` (D1 split). | Delete the route rewrite. | none |
| 2 | 12-15 | T6 | The private `deviceExecutor` is called with a hand-built context from `alphaClient.getState()`. | Drive the operation the way the product receives it: the agent fake streams a device action (`files_filter` / `files_open` / `files_folder_create`) and the renderer executes it. Assert the visible result and the receipt the bridge records. | Medium. It needs a harness hook for "agent proposes a device action". |
| 3 | 18, 28, 37 | P2 | Seeding and listing go through in-page `registerPlugin('AlphaFiles')`. | Use the harness file seed and bridge reads. | none |

## Proposed end state
Three tests in an "agent actions" block of `journeys/files.spec.ts` on the harness agent fake: a filter opens Files
and the row works, an open waits for the first render, and a folder mutation from Home is refused with no navigation.
They use no rewritten sources and no private calls.
