# specs/quint/refinement/native/HostedInboxTraces.java
- Lines: 517 | Kind: Quint refinement harness (real `HostedDelivery`, `HostedInbox`, `HostedResultNotices`, `ResidentResultSession`, `ResidentResultTransport` in a JVM; synthetic storage and resident IPC) | Verdict: KEEP (follow product deletions)
- Covers: resident hosted-results inbox: two-page poll, exact ACK after durable row+index, ACK-reply loss and equivalent replay, generation retirement during fetch, background pause, partial writes, notice retry without re-post, packed-cache (100-row) eviction journal, credential expiry, invalid/unordered pages. Duplicates: partially `test/resident-result-transport.test.mjs` + `test/fixtures/ResidentDeliveryTest.java` (javac unit of the same transport), `test/native-notification-*.test.mjs` (source text). Callers/importers: `hosted-inbox.mjs` (`checkNativeHostedInbox`), native aggregate `index.mjs`, `test/quint-native-hosted-inbox.test.mjs`.
- Model live: yes, `NativeHostedInbox` (sources `HostedInbox`, `HostedDelivery`, `ResidentResultSession`, `ResidentResultTransport`, `HostedResultNotices`). Only `mode: "resident"` is driven, which is the path DECISIONS D5 keeps.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `hosted-inbox.mjs:61-63` | A3 follow-up | The driver compiles `HostedTransport.java` and `CloudDeployment.java`; `HostedTransport` is a DELETE candidate (C4, cloud/remote modes). The harness never uses them. | When C4 lands, drop `HostedTransport` from the compiled list. | low |
| 2 | 309, 353 | follow-up | Catches `HostedDeliveryCancelled` / `HostedStorageFault`; both are MERGE candidates into `HostedDelivery` (nested classes). | Rename references in the same change as the merge. | low |
| 3 | 454-458 | T10 | Reads private fields `operation` (ReentrantLock) and `transport` of `HostedDelivery`, and `closed` of the transport, by name. | Acceptable for a lock-custody observation; keep, but list these names in the HostedDelivery report so a rename updates them. | low |
| 4 | driver 20-58 | C5 | Stub `Support.java` (System, BuildConfig, AlphaCredentialStore, HostedNoticePoster, HostedDeliveryWorker, AlphaLocalAgentPlugin, ElizaAgentService) is a string inside the driver; `HostedResultNoticeTraces` driver carries a different HostedDelivery stub. | Move stubs to `.java` files under a `stubs/` folder so javac errors point at real lines; share where identical. | low |
| 5 | 474-482 | — | URL stream handler refuses network: good guard against real side effects (AGENTS.md). | Keep. | — |
| 6 | — | T4 | Run by the per-model test and again by the native aggregate. | One runner. | — |

## Proposed end state
Unchanged scenarios; compiled list shrinks to resident-only sources once hosted/paired modes are deleted; exception class names follow the merge.
Stubs live in files. Path filter: `android/app/src/main/java/**/{Hosted*,Resident*,NativeDigestSources,NativeDeviceEnrollmentKey}.java`, the pinned `NoticeOwner.java` via `upstream.lock.json`, the model and this directory.
