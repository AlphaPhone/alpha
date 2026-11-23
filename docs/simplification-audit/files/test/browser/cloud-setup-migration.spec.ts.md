# test/browser/cloud-setup-migration.spec.ts
- Lines: 15 (6.5 KB) | Kind: module-in-page (T6/P1) + one diagnostics-UI test, chromium | Verdict: **DELETE**
- Covers: the development Cloud "sample account" setup document (`browser/development-cloud.ts` `developmentCloudSetupDocument`/`developmentPersonal`): CAS between tabs, legacy-byte preservation, failed edit, stale recovery, and a recovery dialog with a backup download. Duplicates: none outside C4 harness tests. Callers/importers: none. 7 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A3 (C4) | Imports `browser/development-cloud.ts`, which C4 lists for deletion (personal/hosted development Cloud). | Delete with C4. | none |
| 2 | 9 | A1 | "setup preserves exact legacy bytes" tests a legacy localStorage reader (D1). | — | none |
| 3 | 10, 11 | P3 | Patches `IDBObjectStore.prototype.put` and `browserDocuments.read`. | — | none |
| 4 | 13-14 | P2 / D3 | Opens diagnostics through the backdoor and downloads a "Cloud setup backup" (backup/export is D3). | — | none |
| 5 | name | P8 | `*-migration` name; research P8 lists it as a legacy-data fossil. | — | none |

## Proposed end state
File removed with the development personal-Cloud setup (C4). No replacement.
