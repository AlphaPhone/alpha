# test/browser/cloud-account-migration.spec.ts
- Lines: 14 | Kind: Playwright, `chromium` plus `firefox`/`webkit` (listed in `scripts/storage-specs.ts:38`); module-in-page unit tests of the development Cloud account simulator (T6) with an `IDBObjectStore.prototype.put` patch (P3) | Verdict: **DELETE**
- Covers: the developer simulator's personal Cloud account document (`apps/app/src/browser/development-cloud.ts`, `development-account-document.ts`, `development-identity.ts`): empty hydration, failed first selection, late hydration vs newer selection, concurrent tabs, stale identity refusal, migration from the legacy key `alpha.browser.cloud.account.v1` with exact bytes, stale recovery reset refusal, a "Download Cloud account backup" / reset dialog, scenario reset. Duplicates: none. Callers/importers: `scripts/storage-specs.ts:38` (cross-browser list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 9 | A1 (D1) | Tests migration from the legacy key `alpha.browser.cloud.account.v1` and "legacy selection keeps exact bytes". | Delete with the legacy reader. | none |
| 2 | 11 | A3 (D3) | "Download Cloud account backup" and reset dialog, reached through `connectionController.open()` because the Settings entry was removed (comment). | Delete with the backup path. | none |
| 3 | 4-14 | T6, D19 | Every other test calls simulator functions directly. D19 deletes the personal-Cloud simulator. | Delete. | none |
| 4 | 5 | P3 | `IDBObjectStore.prototype.put` patched to throw for one key. | Gone. | none |
| 5 | n/a | P1 | Runs in three browsers. | Remove the entry from `scripts/storage-specs.ts`. | none |

## Proposed end state
Delete the file and its `scripts/storage-specs.ts` entry together with the development Cloud account simulator and its
legacy-key reader. No replacement: the production Cloud account path is covered by `cloud-account-replacement.production.spec.ts`
and the sign-in journeys.
