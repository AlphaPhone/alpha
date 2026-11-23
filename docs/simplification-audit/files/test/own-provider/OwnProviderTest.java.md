# test/own-provider/OwnProviderTest.java
- Lines: 51 | Kind: Java fixture, unit of upstream `NativeProviderSlot` + `NativeProviderAdmission` (+ `NativeRuntimeEmbeddings`) with a hand-written in-memory `Store` | Verdict: DELETE
- Covers: own-key provider save (single write, refusal leaves slot unchanged, write conflict throws), provider environment isolation (Cartesia/Cloud keys removed or set), status identity never carrying secrets, Cloud account binding and managed Google binding refusing a changed token. Duplicates: upstream `vendor/eliza/plugins/plugin-native-agent/test/connection/OwnerProviderTest.java` ("Offline contracts for explicit owner credentials, leases and fixed speech transport", imports `NativeProviderSlot`, `NativeProviderAdmission`). Callers/importers: only `test/own-provider.test.mjs:7-9`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-51 | T5 / T4 | Every class under test is in `vendor/eliza`; upstream has its own offline test of the same contracts. Alpha passes only the product name `"Alpha"`. | Delete with test 1 of `own-provider.test.mjs`. | Low |
| 2 | 9-15 | T3 | Hand-written `Store` fake around the slot; a unit test of upstream code. | Gone with the file. | None |
| 3 | 40-48 | - | Managed Google binding refusal on a changed Cloud token is the one case that looks security-relevant. | Check that upstream `OwnerProviderTest` covers it; if not, upstream follow-up (D14). | Low |

## Proposed end state
File deleted. Alpha's own-provider behaviour is covered end to end by the Settings own-provider journey (`journeys/connection-cloud.spec.ts`) and on device; the native slot logic is covered by the upstream suite.
