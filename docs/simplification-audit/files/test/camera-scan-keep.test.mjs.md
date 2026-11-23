# test/camera-scan-keep.test.mjs
- Lines: 59 | Kind: transplant (brace-matching slices of `async function keepScan(` and `async function changeSelection(` from `prototype/camera-adapter.ts`, type-stripped and run in `vm` with ~30 sandbox globals) over real upstream `createScanCapture` and upstream `photos-view.ts` batch helpers | Verdict: DELETE; REWRITE two cases as `journeys/camera-photos.spec.ts` steps
- Covers: an unknown native Keep of a scan is retried under the same operation id while a definite failure starts a new one; cancelling Android review of a Photos selection change shows no toast, other rejections say "Unconfirmed". Duplicates: `vendor/eliza/plugins/plugin-native-camera/src/scan-document.test.ts` (scan capture keep rules upstream). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | T2 | Hand-rolled brace counter to cut functions out of the adapter. | Delete. | Low |
| 2 | 8-9 | T5 | Imports upstream modules from `.eliza` by relative path. | Gone. | - |
| 3 | 21-34 | - | Same operation id on retry after unknown: data-duplication guard. | Journey step: Photos bridge fake answers `unknown` then `saved`; assert one row and the same `operationId` in the fake's log. | Low |
| 4 | 47-59 | - | Toast policy on selection change rejection. | Journey step in Photos (trash a selection, fake rejects with `LIBRARY_DECLINED` / `LIBRARY_STALE`). | Low |
| 5 | 39-43 | C1 | 30-field sandbox mirrors adapter closure state. | Gone. | - |

## Proposed end state
Deleted. Two steps in `journeys/camera-photos.spec.ts` (scan Keep retry; selection change rejection toasts) on the
shared Photos/Camera bridge fakes.
