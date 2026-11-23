# test/browser/domain-initialization.spec.ts
- Lines: 26 | Kind: Playwright, chromium plus firefox/webkit (`storage-specs.ts:37`). Module-in-page (T6, s2/r0) | Verdict: **DELETE**
- Covers: 20 concurrent first reads of a `BrowserDomainDocument` import a legacy `localStorage` value with exactly one IndexedDB write, and the recovery capture stays usable after reset. Duplicates: Quint `domain-document-creation.mjs` with `test/quint-domain-document-creation.test.mjs` (creation once). Callers: chromium, firefox and webkit.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 9-11 | A1 | The whole test is about importing a legacy `localStorage` value (`legacy='  { "count" : 7 }\n'`). D1 deletes the legacy reader. | Delete with the reader. Remove the entry from `scripts/storage-specs.ts`. | none |
| 2 | 12-13 | P3 | `IDBObjectStore.prototype.put` is patched to count writes. | Deleted with the file. | none |

## Proposed end state
Delete the file and its line in `scripts/storage-specs.ts`. Create-once without a legacy source stays model-checked by
the Quint creation harness.
