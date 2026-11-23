# test/browser/digest-execution-migration.spec.ts
- Lines: 27 | Kind: Playwright, chromium, dev simulator. 6 of the 7 tests are module-in-page calls to `developmentDigestRequest`, `developmentDigestDocument` and `readDevelopmentDigests` (T6; s25/r6 in research). 1 drives a recovery dialog | Verdict: **DELETE**
- Covers: the dev digest simulator's storage. Empty polling creates no document; a two-tab tick delivers one result with both acks; a failed commit rolls back cursor, result and occurrence; a retired connection cannot commit; legacy bytes survive migration; a saved grant blocks a stale reset; damaged schedules download and reset. Duplicates: occurrence-once and ack semantics belong to the agent (upstream plugin-workflow), which `flag-off-android.ts` models for the production lane and which `test/digest-occurrence-delivery.test.mjs` covers on the host side. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-24 | T6 | Every test calls the simulator's HTTP stand-in (`/api/workflow/hosted/tick`, …) in the page. The tests check the dev scheduler's internals, not a user journey. | Delete. | Low. The simulator itself is dev-only (D19, U-R1). |
| 2 | 19-21, 25-27 | A1 | "exact legacy digest bytes survive migration" and the damaged-schedule download test the legacy `alpha.browser.digests.local.v1` mirror. | Delete with the reader (D1). | none |
| 3 | 14, 17 | P3 | The test patches `IDBObjectStore.prototype.put` and `browserDocuments.read`. | Delete. | none |
| 4 | 9, 14, 17 | T8 | `page.clock.setFixedTime` is set on two tabs separately. | Deleted with the file. | none |
| 5 | 3 | P2 | `boot` writes the connection selection to `localStorage` after load, as a backdoor that bypasses the chooser. | Deleted with the file. | none |

## Proposed end state
Delete the file. The production lane (`journeys/digests.production.spec.ts`) covers the user-visible schedule journey
against the agent stub. If the owner wants the dev simulator's scheduler kept correct, that belongs in one host
integration test that imports `dev/` modules, not in Playwright.
