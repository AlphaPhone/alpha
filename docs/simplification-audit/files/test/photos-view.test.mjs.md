# test/photos-view.test.mjs
- Lines: 172 | Kind: unit tests of an upstream module (`upstream renderer: mobile-shell/photos-view.ts`) + source-text (2 tests) | Verdict: DELETE (upstream follow-up for the pure algorithms)
- Covers: Photos grid rules: day sections, newest-first window merge, selection patching, favourite toggles and batches, drag range and pinch columns, local filter matching and labels, days left and byte formatting, `virtualGrid`, `readWindow` reloads, `changeBatches` and `runBatches` cancel semantics, `thumbnailPlan`, `keepThumbnails`. Duplicates: `test/photos-thumbnail-refresh.test.mjs` (`readWindow`); Playwright `photo-order.spec.ts` (order and page boundaries), `photos-grid-density.spec.ts` (virtual rows), `photo-batch.spec.ts` and `photo-permitted-batch.spec.ts` (batches), `photo-filter-fallback.spec.ts`, `photos-pending-read.production.spec.ts` (deep window). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T5 | Every behaviour test imports an upstream file through `.eliza`. `vendor/eliza` has no test for `photos-view.ts` (only `photos-view-contract.test.ts`). | Upstream follow-up (D14): move the pure cases into `vendor/eliza/packages/ui` next to the module. Delete here. | medium until upstream lands (`virtualGrid` height arithmetic and `runBatches` cancel semantics have no other host test) |
| 2 | 75-83 | T1 | "No search box, scope narration or 20-item cap": string absence and regexes on `camera-adapter.ts` and a slice of `template.html`. | Delete. Copy rules belong in the production bundle audit if they matter. | none |
| 3 | 114-119 | T1 | "The Library grid is virtualised": regexes on `camera-adapter.ts` and `template.html`. | Delete. `photos-grid-density.spec.ts` checks virtual rows in the rendered page. | none |
| 4 | 136-149 | T4 | `runBatches` and `changeBatches`: cancelling the first confirmation stops the run, and other failures continue. | Carry one case into `journeys/camera-photos.spec.ts` if `photo-batch.spec.ts` lacks a cancel-the-review step (check during the journey merge). | low |
| 5 | 1-172 | T3 | Pure-function cases on a fixed clock; no product wiring is exercised. | Gone with the file. | none |

## Proposed end state
Deleted. The pure algorithms get their unit tests upstream, where the module lives. The phone's behaviour is held by the
`journeys/camera-photos.spec.ts` journey (order, virtual grid, batches, filter, deep reload). Upstream item for `cross-file-actions.md` §6:
"add `photos-view.test.ts` in `upstream renderer: mobile-shell`".
