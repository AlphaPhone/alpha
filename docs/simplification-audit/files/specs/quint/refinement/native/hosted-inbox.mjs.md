# specs/quint/refinement/native/hosted-inbox.mjs
- Lines: 97 | Kind: Quint refinement driver (whole app hosted-delivery classes; synthetic storage/IPC in a JS-string `Support.java`) | Verdict: KEEP (follow C4 deletions)
- Covers: resident hosted-results inbox: two-page poll, exact ACK, ACK loss and replay, generation retirement, partial writes, notice retry, 100-row packed-cache eviction journal, credential expiry (12 scenarios); model `NativeHostedInbox` (native manifest, live). Only the resident mode is driven (`HostedDeliveryWorker.schedule` stub throws if `!resident`), the path DECISIONS D5 keeps. Duplicates: `test/resident-result-transport.test.mjs` (javac unit of the transport). Callers/importers: `test/quint-native-hosted-inbox.test.mjs`, native aggregate `index.mjs:50,195` (T4). (`application/index.mjs` and `test/quint-renderer-hosted-inbox.test.mjs` import a different `application/hosted-inbox.mjs`.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 61-63 | A3 follow-up | Compiles `HostedTransport.java` (remote/cloud transport, C4 deletion candidate) and `CloudDeployment.java`; the resident scenarios never reach them. | Drop from the compiled list when C4 lands (it then must not be needed for compilation). | Low |
| 2 | 61 | follow-up | `HostedDeliveryCancelled`, `HostedStorageFault` are MERGE candidates into `HostedDelivery`. | Update list in that change. | Low |
| 3 | 20-58 | D6 / C4 | `Support.java` stand-ins (System, BuildConfig, AlphaCredentialStore, HostedNoticePoster, HostedDeliveryWorker, AlphaLocalAgentPlugin, ElizaAgentService) live in a JS string; `hosted-result-notices.mjs` carries a different `HostedDelivery`. | `stubs/hosted-inbox/Support.java`. | Low |
| 4 | 68 | B5 | Asserts the vendor `NoticeOwner.java` hash equals the pin inventory — already guaranteed by the upstream pin check. | Delete. | None |
| 5 | 79-84 | — | Post-processing of expectations into Quint map/set shapes (`qmap`/`qset`). Fine. | Keep. | — |

## Proposed end state
Same 12 scenarios against resident-only sources; stubs in a file; no pin re-verification; one runner.
