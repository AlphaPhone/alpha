# specs/quint/native/CopyReceipt.qnt
- Lines: 103 | Kind: Quint model (registered in `native` but models the browser/web photo library) | Verdict: DELETE (models the non-native preview backend, not production) — owner question below; if the owner keeps it, MOVE to `application/` and PORT the observer
- Covers: one photo-edit receipt in the browser Photos library (IndexedDB `alpha.browser.photos.v1`): a save claims the receipt for one attempt/mode, the written copy and receipt commit together, a recovery read retires a suspended save, copy never writes the original, replace overwrites exactly the reviewed revision. Duplicates: `test/browser/browser-photo-edit.spec.ts` (Playwright journey over the same module; the harness even hashes it as an input), `test/quint-copy-receipt.test.mjs` (re-runs this campaign plus two mutation canaries). Callers/importers: `quint:check` (9 runs, 5 witnesses); `specs/quint/refinement/native/copy-receipt.mjs` (Vite + Chromium), run from `refinement/native/index.mjs:94`; manifest `symbols` pin 6 names in `apps/app/src/prototype/browser-camera.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5; manifest `sources` | A5 / D19 | The only source is `apps/app/src/prototype/browser-camera.ts` (`browserPhotoLibrary`). `camera-adapter.ts:126` selects it only when `!Capacitor.isNativePlatform()`, i.e. in the browser preview; the Android product uses `AlphaPhotoLibraryPlugin` / upstream `SelectedPhotoCopy` (covered by `MediaLifecycle`). The model therefore proves a property of the development preview backend, which the owner brief does not ask to keep ("models of live product code stay"). | DELETE the `.qnt`, its manifest entry, `refinement/native/copy-receipt.mjs`, `test/quint-copy-receipt.test.mjs`, the `checkCopyReceipt` entry in `native/index.mjs:70,94`. Carry two cases into `journeys/camera-photos.spec.ts` (successor of `browser-photo-edit.spec.ts`) if not already there: "copy never overwrites the original" and "cancel during save leaves the original and no copy". | Low for product (preview-only path); loses formal coverage of browser edit-receipt atomicity. |
| 2 | harness `copy-receipt.mjs:118-121` | T10 | (If kept) The observer is injected by text: after the literal `const edits=new Map<string,EditSession>();` it appends `globalThis.copyReceiptSession=…`; mutation canaries replace literal guard strings (`mutations[mutation]`). | PORT: export a read-only `editSessionSnapshot(id)` from the module (dev-only), and drop the text canaries (B5) or keep one. | Low |
| 3 | harness `copy-receipt.mjs:100-103` | §2.3 | (If kept) Hashes every file under `apps/app/src` and `.eliza/client-features`, so any renderer edit invalidates the receipt. | Hash only the served module graph (the `transform` hook already records `loaded`). | Low |
| 4 | manifest `symbols` | T10 | Pins `savePhotoEdit`, `resultPhotoEdit`, `cancelPhotoEdit`, `EditRecord`, `editKey`, `replace` by regex; `replace` matches almost any file. | Removed with the model. | None |
| 5 | file location | D11 | A browser (web) model registered in the `native` family. | Removed; if kept, move to `application/`. | None |

## Proposed end state
Deleted with its harness and wrapper test. The preview photo-edit behaviour stays covered by the
`journeys/camera-photos.spec.ts` journey; the native copy path stays covered by `MediaLifecycle` (`SelectedPhotoCopy`).
If the owner wants formal coverage of the preview backend, it moves to `application/` with an exported snapshot
instead of text injection.
