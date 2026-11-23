# test/browser/cloud-personal-intent-storage.spec.ts
- Lines: 11 (7.2 KB, one statement-soup line per test) | Kind: module-in-page (T6/P1), chromium | Verdict: **DELETE**
- Covers: CAS, owner isolation, legacy-byte preservation and cancellation of the personal-Cloud setup intent document (`runtime/cloud-personal-intent.ts`). Duplicates: `test/cloud-personal-protocol.test.mjs` (also on the C4 delete list). Callers/importers: none. 9 tests, all `page.evaluate(import('/src/runtime/cloud-personal-intent.ts'))`; one opens `openDomainRecovery` directly.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | A3 (C4, D5) | Tests storage for the retired personal Dedicated-agent setup; `cloud-personal-intent.ts` is on the delete list and is reachable only through the test-mocks hosted path. | Delete with C4. | none |
| 2 | 3-10 | T6 / P1 | No user action; every test calls module functions and compares return values. | — | none |
| 3 | 6 | P3 | Monkey-patches `IDBObjectStore.prototype.put`. | — | none |
| 4 | 7 | A1 | "legacy intent bytes remain exact" tests a legacy envelope reader. | — | none |
| 5 | 11 | P2 | Opens the recovery dialog by calling `openDomainRecovery` directly and downloads a backup (backup/export is D3). | — | none |

## Proposed end state
File removed. No replacement: the feature is deleted. Remove its row from `test/support/feature-parity.mjs` if that inventory survives (D15 deletes it).
