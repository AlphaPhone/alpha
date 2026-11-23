# test/browser/digest-authorization-migration.spec.ts
- Lines: 48 | Kind: Playwright, chromium, on the dev simulator (`?mode=dev`). 7 of the 11 tests call `digestAuthorizationDocument` in the page with no user action (T6); 4 drive the Scheduled digests panel, which a `HostedDigestProtocol.prototype.delegation` patch stands in for (P3) | Verdict: **DELETE** (if Q-HOST-5 keeps the delegation panel, carry 2 cases to `journeys/digests.spec.ts`)
- Covers: the dev-simulator store for a pending Cloud read-delegation request: empty reads, the cross-tab CAS winner, rollback when a commit fails, keeping legacy `localStorage` bytes, stale recovery, retirement, a damaged-bytes download, and in the UI the abort-on-close / abort-on-background behaviour and the reach of the recovery dialog. Duplicates: the same storage contract is tested for every `BrowserDomainDocument` user in `domain-atomicity`, `digest-inbox-migration` and `execution-storage-migration`; the Quint `HostedDigest` model and `hosted-digest-refresh.mjs` model the delegation phases. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-30 | T6 | The first six tests import `/src/browser/digest-authorization-document.ts` and call `read/save/capture/reset` directly. None of them performs a user action. | Delete. | Low. This is the dev store; it moves to `dev/` (U-R1). |
| 2 | 24-26, 40-42 | A1 | "exact legacy authorization is retained" and "damaged authorization downloads exact bytes" test the `{legacy,value}` envelope and the legacy `localStorage` mirror that D1 deletes. | Delete with the reader. | none |
| 3 | 22, 29 | P3 | The test patches `IDBObjectStore.prototype.put` and `browserDocuments.read` to inject faults. | Delete. | none |
| 4 | 37, 44 | P3 | `HostedDigestProtocol.prototype.delegation` is replaced to hold the start request open. | If the cases are kept, hold the request at the agent bridge (`Agent.request` route) instead. | Low |
| 5 | 36-45 | coverage | Two behaviours are visible to the user: closing the panel aborts the pending start but keeps the saved request, and backgrounding pauses with "Authorization paused. Close and reopen…". | Carry these two to `journeys/digests.spec.ts`, only if the Cloud read-delegation panel is in scope (Q-HOST-5). | Medium |
| 6 | 33-35, 46-48 | C4 | The keyboard/Back ownership of the recovery dialog over the panel is the generic owned-dialog rule. | Covered once by the owned-dialog consolidation in the accessibility journey. Delete here. | Low |
| 7 | 3, 7, 32 | D8 | One-line setup functions with deeply nested evaluate bodies. | Deleted with the file. | none |

## Proposed end state
Delete the file. If the owner keeps Cloud read delegation (Q-HOST-5), `journeys/digests.spec.ts` gets two tests on
the harness: "closing review aborts the start and keeps the saved request" and "backgrounding pauses authorization
until the panel is reopened". Both hold the start request at the agent bridge.
