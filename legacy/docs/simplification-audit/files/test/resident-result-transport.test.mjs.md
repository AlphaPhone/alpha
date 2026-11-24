# test/resident-result-transport.test.mjs
- Lines: 35 | Kind: JVM integration of real Alpha classes (`ResidentResultTransport`, `ResidentResultSession`, `HostedInbox`, `HostedDelivery`, `HostedTransport`, …) with fixtures `ResidentResultTransportTest.java`, `ResidentDeliveryTest.java` and a hand-written `Support.java` | Verdict: DELETE
- Covers: resident result IPC verifies identity and keeps durable inbox recovery; delivery coordinator retires its session binding. Duplicates: `specs/quint/refinement/native/hosted-inbox.mjs` compiles the same classes (`ResidentResultSession`, `ResidentResultTransport`, `HostedTransport`, `NativeDigestSources`, `NativeDeviceEnrollmentKey`, `HostedInbox`, `HostedDelivery`) and checks `NativeHostedInbox.qnt` traces; `test/browser/resident-background-results.spec.ts`. Callers/importers: `npm test` glob; `test/fixtures/native-source.mjs`, `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-35 | T4 | Same class set as the hosted-inbox refinement harness, compiled twice per verify. | Delete. | Low |
| 2 | 32 | A3/D5 | Compiles `HostedTransport.java` and `NativeDeviceEnrollmentKey` (C4 deletion targets): breaks with stage A4. | Goes with the file. | Low |
| 3 | 23-31 | T3 | Hand-written `Support.java` stubs `AlphaLocalAgentPlugin`, `ElizaAgentService`, `AlphaCredentialStore`. | Goes with the file. | Low |

## Proposed end state
File, `test/fixtures/ResidentResultTransportTest.java` and `ResidentDeliveryTest.java` deleted (no other importers).
The hosted-inbox Quint refinement is the single host-side check; it must drop `HostedTransport` when C4 lands.
