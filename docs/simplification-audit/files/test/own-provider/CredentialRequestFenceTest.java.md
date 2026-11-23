# test/own-provider/CredentialRequestFenceTest.java
- Lines: 20 | Kind: Java fixture, unit of upstream `CredentialRequestFence` + `CredentialIntentFence` (both `vendor/eliza/plugins/plugin-native-agent/.../runtime/`) | Verdict: DELETE
- Covers: request-lease lifecycle (reserve/begin/require/finish/cancel), stale cancellation, capacity of 64 abandoned leases, expiry after 120 s. Duplicates: upstream `vendor/eliza/plugins/plugin-native-agent/test/connection/OwnerProviderTest.java` (imports the same `CredentialIntentFence`/`CredentialRequestFence`; run by upstream `connection.node.mjs`). Callers/importers: only `test/own-provider.test.mjs:16-19` (third test), compiled with `runJvm` from `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-20 | T5 | Tests upstream classes only; no Alpha code is compiled. Upstream already ships an offline test of the same fence (`OwnerProviderTest.java`). | Delete with test 3 of `own-provider.test.mjs`. | Low |
| 2 | 7-17 | D8 | Statement-soup Java (one 300-char line per scenario). | Gone with the file. | None |

## Proposed end state
File deleted. Lease behaviour stays covered upstream; if the upstream test is thinner than this one (expiry and 64-lease capacity), file an upstream follow-up (D14) to add those two cases there rather than keeping a copy here.
