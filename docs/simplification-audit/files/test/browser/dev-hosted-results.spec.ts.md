# test/browser/dev-hosted-results.spec.ts
- Lines: 29 (8 tests) | Kind: Playwright `chromium`, dev build; module-in-page tests of `browser/hosted-results.ts` (18 `/src` imports, 6 locators) | Verdict: **MERGE** 1 case into `journeys/notifications.spec.ts`; delete 7
- Covers: hosted result notices persist, deduplicate, do not store result text, consume once, reject wrong accounts and changed results, survive storage failure, keep a bounded 200-row ledger without evicting a pending tap, have a stable identity for failed results; the shade shows "Scheduled digest" without result text and Clear all removes it. Duplicates: `specs/quint/refinement/application/browser-hosted-result-notice.mjs` (Quint refinement of the same store); `dev-hosted-journey.spec.ts`; `journey-f-hosted-result.spec.ts`. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | P2 | `setup` binds the store with a hand-made route and hash in-page on every boot. | Gone with the file; the journey uses `hosted-harness.ts`. | none |
| 2 | 4-14, 18-29 | T6, T4 | Seven tests call `publishResult`, `action`, `consumeResult`, `disableBackground` directly; one patches `IDBObjectStore.prototype.put`; one loops 200 publishes. They duplicate the Quint refinement. | Delete. | Low; ledger bound (200) and tap retention stay proven by the Quint model. |
| 3 | 15-17 | — | Shade shows "Scheduled digest", hides "Private retained result", Clear all removes it. Privacy property. | Carry into the notifications journey, publishing through the hosted harness instead of the module. | none |

## Proposed end state
One step in `journeys/notifications.spec.ts`: a digest result notice in the shade never shows the result text and Clear all removes it. Delete the file.
