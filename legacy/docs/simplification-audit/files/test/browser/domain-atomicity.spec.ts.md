# test/browser/domain-atomicity.spec.ts
- Lines: 96 | Kind: Playwright, chromium plus firefox/webkit (it is in the `scripts/storage-specs.ts` list). Module-in-page: `BrowserDomainDocument` over the real `browserDocuments` IndexedDB/Web Locks store, with no user action (T6, s2/r0) | Verdict: **MERGE into `test/browser/storage-contract.spec.ts`** (2 cases), rest deleted
- Covers: `BrowserDomainDocument.edit` over the real store. A second tab waits on the Web Lock; both edits commit in order; a missing `navigator.locks` rejects before initialization; a failed edit or a `QuotaExceededError` put commits nothing and releases the lock; closing a tab mid-edit releases ownership; 2 × 25 rapid cross-tab edits keep every item and a unique receipt. Duplicates: Quint `specs/quint/refinement/application/storage.mjs` executes the actual `BrowserDomainDocument` against an injected CAS port, and `domain-document-creation.mjs` with `test/quint-domain-document-creation.test.mjs` covers creation. Neither runs the real `browser/documents.ts` IndexedDB plus Web Locks implementation, which this spec does. Callers: chromium, and firefox/webkit through `storage-specs.ts:19`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-9 | T6 | The test constructs `BrowserDomainDocument` in the page under a test key `alpha.test.atomic`. No product surface is involved. | This is accepted as the T3 exception: it is the only test of the real IndexedDB/Web Locks store, which production modules use (`notification-store`, `hosted-results`, `preference-documents`, `workflow-intents`, `media-copy-intent`). Keep only the cases below. | Medium. Deleting it outright leaves the real store untested. |
| 2 | 37-48 | B2 | "missing lock support rejects" deletes `navigator.locks`. Web Locks always exist in the Android WebView and in supported browsers; this checks a phantom capability. | Delete the case, and the product guard if it only exists for it. | none |
| 3 | 63 | A1 | `legacy:'{"count":7}'` asserts the legacy `localStorage` mirror stays untouched. That mirror is deleted with the `{legacy,value}` envelope (D1). | Drop the `legacy` field from the assertion when the envelope goes. | none |
| 4 | 57 | P3 | `IDBObjectStore.prototype.put` is patched to throw `QuotaExceededError`. | Prefer a CDP `Storage.overrideQuotaForOrigin` quota (chromium only), or keep the patch: it is the storage boundary, not a product class. | Low |
| 5 | 14-35, 66-79 | T4 | "cross-tab edits read the last committed value" and "closing a tab during an edit" are both covered by the 50-edit race test (ordering and lock release). | Keep the race test and the failed-persistence rollback test; delete the other three. | Low |

## Proposed end state
One `test/browser/storage-contract.spec.ts` (still on the firefox/webkit storage list) with two tests on the store
that replaces `BrowserDomainDocument` after D1: "rapid cross-tab edits keep every committed item and receipt" and "a
failed edit or quota error commits nothing and releases the lock". It is the only spec allowed to import a `/src`
module, and the file header says so.
