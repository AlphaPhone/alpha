# test/fixtures/ResidentDeliveryTest.java
- Lines: 36 | Kind: integration (host JVM: real `HostedDelivery`, `HostedInbox`, `HostedResultNotices`, `ResidentResultTransport`, `ResidentResultSession`, `HostedTransport`, `NativeDigestSources`, `RendererCredentialSlots`, `NativeDeviceEnrollmentKey` plus a JS-generated `Support.java` of Android/plugin stubs) | Verdict: MERGE into one `ResidentResultDeliveryTest` with `ResidentResultTransportTest.java` (target: Gradle JVM `workflows-digest` suite; interim: keep both test cases in `test/resident-result-transport.test.mjs`)
- Covers: resident-mode delivery configure, shared inbox history, background polling on/off, session disable and credential cleanup, restart adoption (same agent, new root), retry while the runtime is absent or starting, and the fence when a different agent replaces it. Duplicates: partly `specs/quint/refinement/native/hosted-inbox.mjs` (compiles the same nine classes; its traces cover inbox sync and the 15 s resident IPC bound, not configure/polling/disableSession). Callers/importers: only `test/resident-result-transport.test.mjs:18-35`. It reaches into `ResidentResultTransportTest.Channel` (line 24) and the generated `Support.java` reads `ResidentResultTransportTest.EXPIRES`, so the two fixtures already form one test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-33 | D8 | Each line holds 3-8 statements; failures report a bare `AssertionError()` with no message (line 4). | When merged, one statement per line and a message per `require`. | — |
| 2 | 10-11 | C6 | Hard-codes the device slot key `device:a5a78b…` and origin hash. | Compute the key from the same helper the product uses. | Low |
| 3 | 14 | — | Uses only `mode=resident`. The `remote`/`cloud` modes of `HostedDelivery.configure` are slated for deletion (C4 / Q-HOST-1), so the fixture survives that deletion unchanged. | — | — |
| 4 | 7 | C3 | `rejects(...)` duplicates the copy in `ResidentResultTransportTest.java:11`. | One copy after the merge. | — |
| 5 | importer 22-31 | T9 | The importer writes `Support.java` (BuildConfig, AlphaCredentialStore, HostedNoticePoster, HostedDeliveryWorker, AlphaLocalAgentPlugin, ElizaAgentService stubs) as a JS template string. | Move the stubs into a real `.java` file next to the test (shared Gradle stub set later). | — |

## Proposed end state
One `ResidentResultDeliveryTest.java` (transport, session and delivery cases) with checked-in stubs, run by
the Gradle host-JVM task, replaces both fixtures and both test cases of `resident-result-transport.test.mjs`.
Cases that the hosted-inbox Quint replay already proves (sync, ack, lost-ack recovery) are dropped from it.
