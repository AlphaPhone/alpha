# test/browser/digest-inbox-migration.spec.ts
- Lines: 48 | Kind: Playwright, chromium, dev simulator. 7 of the 9 tests call `browserDigestStore` (`/src/browser/digest-storage.ts`) in the page (T6). 2 open recovery dialogs | Verdict: **DELETE**
- Covers: the dev digest-inbox slot store. Empty reads, two tabs merging 20 slots into one document, a legacy slot migration, rollback on a failed commit, stale recovery, rejection of a late read on retirement, the per-slot damaged-archive download, and the reach of the recovery dialog from Scheduled digests. Duplicates: the same `BrowserDomainDocument` contract appears in `digest-authorization-migration`, `execution-storage-migration` and `domain-atomicity`; Quint `renderer-hosted-inbox.mjs` models the inbox. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-34 | T6 | The first six tests are store API calls with `toEqual` on the return values. | Delete. | Low. `digest-storage.ts` moves to `dev/` (U-R1). |
| 2 | 23-25, 35-40 | A1 | Legacy `alpha.browser.hosted-digests:*` slot migration, plus a "download each exact slot" of legacy bytes. | Delete with the legacy reader (D1). | none |
| 3 | 27, 33 | P3 | Patches of `IDBObjectStore.prototype.put` and `browserDocuments.read`. | Delete. | none |
| 4 | 41-48 | C4 | The recovery dialog opens and closes, and closes on retirement. This is the generic recovery/owned-dialog lifecycle, also in `domain-recovery-lifecycle`. | Covered once in `journeys/calendar.spec.ts` (see `domain-recovery-lifecycle.spec.ts.md`). Delete here. | Low |

## Proposed end state
Delete the file. The production lane covers digest results through `AlphaHostedResults.syncInbox` in the flag-off
harness. The dev store needs no Playwright coverage.
