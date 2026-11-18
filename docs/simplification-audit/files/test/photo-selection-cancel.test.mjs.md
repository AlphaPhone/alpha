# test/photo-selection-cancel.test.mjs
- Lines: 43 | Kind: transplant (slices `setLast` and `changeSelection` out of `apps/app/src/prototype/camera-adapter.ts`, strips types, runs in a `vm` context with ~35 injected names; imports upstream `changeBatches`/`runBatches` from `.eliza/.../photos-view.ts`) | Verdict: DELETE
- Covers: declining the first reviewed Photos batch opens no further confirmation and claims nothing; declining a later batch keeps the earlier result ("20 deleted · 25 not changed") and ends the run. Duplicates: `test/browser/photo-permitted-batch.spec.ts:47` ("declining permitted batch 1/2 dispatches no later confirmation", same `LIBRARY_DECLINED` fixture) and `:39`, `:52`. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-12 | T2 | Marker slices of `camera-adapter.ts` (`  // Browser-owned album storage`, `  let accessPanel:`). | Delete. | None |
| 2 | 16-27 | T3 | 35-name fake context reproduces the adapter's closure. | Delete. | None |
| 3 | 32-43 | T4 | Same scenarios as `photo-permitted-batch.spec.ts:47`. | Keep in `journeys/camera-photos.spec.ts`; check the journey asserts the partial-result toast text of case 2. | Low |

## Proposed end state
File deleted. The batch-decline journey (moved into `journeys/camera-photos.spec.ts`) asserts both the first-batch decline (no toast, nothing changed) and the later-batch decline ("20 deleted · 25 not changed").
