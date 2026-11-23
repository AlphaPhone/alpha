# test/browser/notification-storage-migration.spec.ts
- Lines: 43 | Kind: Playwright spec, chromium + firefox + webkit (in `scripts/storage-specs.ts`), 9 tests; module calls on `notification-store.ts`, one UI recovery case | Verdict: DELETE (carry one concurrency case into `journeys/notifications.spec.ts`)
- Covers: notification policy reads without writing a legacy mirror; two tabs injecting 20 events keep all sources and history; import of legacy `alpha.browser.notification-policy.v1`/`alpha.browser.notifications.v2` bytes; stale recovery reset; damaged-policy backup download and reset; concurrent first reads initialise once; recovery without Web Locks. Duplicates: `dev-notifications.spec.ts` (policy persistence and stale edit rejection through Settings UI). Callers/importers: `scripts/storage-specs.ts:8`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 12-14, 18-21 | A1 | Legacy key import, "exact bytes", "refuses changed older data" (`notification-store.ts:10-11` legacy reader). | Delete with the reader. | None |
| 2 | 18-21 | D3 | "Download notifications backup" / "Notification recovery" dialog is backup surface. | Delete with D3, or keep the reset only if recovery of a damaged current document is a product requirement (owner). | Low |
| 3 | 36-43 | B2 | "available without Web Locks": Web Locks exist in every supported engine. | Delete (and the fallback in product code). | None |
| 4 | 7-10 | T6 | Two tabs x 10 `inject` calls: all 20 events kept. Current behaviour, cross-browser relevant. | Carry as one cross-browser step: two tabs post device events, the shade/history lists all of them. | Coverage: cross-tab notification write merge |
| 5 | 24-34 | T6, P3 | Counts `IDBObjectStore.prototype.put` writes during 20 concurrent first reads. | Drop; internal. | Low |

## Proposed end state
File deleted; `scripts/storage-specs.ts` loses line 8. One "two tabs post notifications" step in `journeys/notifications.spec.ts` run by the cross-browser lane.
