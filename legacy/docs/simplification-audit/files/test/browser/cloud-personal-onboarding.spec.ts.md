# test/browser/cloud-personal-onboarding.spec.ts
- Lines: 178 (25.7 KB) | Kind: Playwright through test-mocks diagnostics UI, chromium | Verdict: **DELETE**
- Covers: the development "Dedicated hosting" personal-Cloud setup flow (review, activation, cutover, adoption, stale status, account switch during connect) over an inline `AlphaConnection` bridge. Duplicates: `scripts/test-cloud-personal-flow.ts`, `test/cloud-personal-protocol.test.mjs`. Callers/importers: none. 19 tests (15 + 4 loop scenarios), each a full dev-server boot.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-178 | A3 (C4, D5) | Drives `cloud-personal-protocol.ts`, `cloud-personal-intent.ts`, `cloud-personal-setup.tsx` and the hosted `signInBrowser` controller path, all unreachable in production (`pairingRetired()` unless `testMocksEnabled`) and on the C4 delete list. The PRD says "No hosted-agent pairing". | Delete with C4. | none for product; it is ~19 boots of CI time saved |
| 2 | 1, 52, 101, 154 | P2 | Reaches the screen through `openConnectionDiagnostics` (backdoor `connectionController.open()`). | — | none |
| 3 | 5-7, 53, 56, 96 | P2 | `preloadPageModules` + `window.__alphaModules[...]` to call `connectionController.signInBrowser()` synchronously. After deletion `helpers/page-modules.ts` has 4 importers left. | — | none |
| 4 | 19-50, 122-152 | P6 | Two more inline Capacitor bridges. | — | none |
| 5 | 67, 70, 72 | P3 | Patches `CloudPersonalProtocol.prototype.inspect`, `browserDocuments.edit`, `IDBObjectStore.prototype.put`. | — | none |

## Proposed end state
File removed together with the personal-Cloud product code (C4) and `scripts/test-cloud-personal-flow.ts`. No journey replaces it.
