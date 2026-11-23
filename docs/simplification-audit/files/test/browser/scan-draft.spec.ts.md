# test/browser/scan-draft.spec.ts
- Lines: 36 | Kind: Playwright spec (`chromium`); 3 UI tests and 6 tests that call the upstream draft store (`saveScanDraft`/`readScanDraft`/`deleteScanDraft`) directly with `IDBObjectStore.prototype` patches; 9 tests | Verdict: **MERGE** the UI cases into `journeys/camera-photos.spec.ts` (Scan section); **DELETE** the store unit tests and the legacy-Blob test
- Covers: the saved scan-document draft. It survives reload and opens without a new image. A revision conflict preserves the other writer. Delete keeps the reviewed images. A quota failure never reports "saved". Cancellation rolls back writes and deletes, the stored format is v2 bytes rather than Blobs, failed or cancelled serialization keeps the saved draft, a newer save wins, and legacy Blob drafts are read and upgraded. The store is upstream: `apps/app/src/browser/scan-draft.ts` is 3 lines around `createScanDraftStore` from `vendor/eliza/plugins/plugin-files/src/documents/scan-draft.ts`, and upstream has no test for it. Duplicates: `scan-text-draft.spec.ts` (draft with text layers), `scan-native-page-camera.spec.ts` (Keep draft → Load). Callers/importers: none. It imports `scan-review-navigation`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-36 | A1 (D1) | "legacy Blob drafts remain readable and upgrade on the next explicit save" tests a migrate-on-read path for data that cannot exist on the renamed package. | Delete. Record the upstream reader as an upstream follow-up (D14). | none |
| 2 | 13-33 | T5 / T6 / T3 | Six tests drive the upstream store API with patched IndexedDB (`put`/`delete` abort in a microtask, `arrayBuffer` throwing or held). They are unit tests of upstream code in a browser. | Delete here. Upstream follow-up: plugin-files needs a scan-draft store test (transaction rollback, revision fence, serialization race). | Medium: the store's concurrency rules have no other test until upstream adds one. |
| 3 | 4-6 | – | Save → reload → Load saved draft → download. | Carry. | none |
| 4 | 7-9 | T6-lite | The conflict case writes the "other writer" by calling `saveScanDraft` in the page. | Use a second page in the same context that saves through the UI, which is the real concurrent writer. Then assert "changed", Load draft and Delete draft. | Low |
| 5 | 10-12 | – | The quota failure is injected by patching `IDBObjectStore.prototype.put` for the `drafts` store. That is a storage-boundary fault and acceptable. | Keep the UI half ("Storage full", not "saved"). Drop the API half after `restorePut`. | none |

## Proposed end state
Two steps in the Scan section. The first is "save, reload, load and download". The second is "concurrent writer and
delete" (two pages), with a quota-failure check. Store concurrency, the binary format and the legacy reader are
upstream's to test.
