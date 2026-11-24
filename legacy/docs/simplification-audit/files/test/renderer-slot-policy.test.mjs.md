# test/renderer-slot-policy.test.mjs
- Lines: 35 | Kind: transplant (Java methods sliced into a stub class, T2) | Verdict: DELETE; carry the SMS-ledger cases into Gradle `RendererCredentialSlotsTest.java`
- Covers: Renderer secureRead/Write/Remove/CompareExchange refuse the native SMS send ledger and operation slots. Duplicates: `RendererCredentialSlots.java:22` holds the refused prefixes; `renderer-slot-deployment-namespace.test.mjs` already tests `requireAllowed` with real classes. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 14-15 | T2 | Cuts four `@PluginMethod` methods out of `AlphaConnectionPlugin.java` by text and compiles them inside hand-written stand-ins for `PluginCall`, `AlphaCredentialStore`, `ConnectionMethods`. | Delete. Add `sms-send-ledger`, `sms-send-ledger:v1:device`, `alpha-sms-operation:v1:x` refusals and one unrelated slot acceptance to `RendererCredentialSlotsTest` (every bridge method calls `requireAllowed`, AlphaConnectionPlugin.java:149,178,186,198). | Low |

## Proposed end state
- Removed; SMS ledger slot refusal is 4 asserts in the Gradle slot test.
