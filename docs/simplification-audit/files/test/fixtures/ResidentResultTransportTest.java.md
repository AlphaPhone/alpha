# test/fixtures/ResidentResultTransportTest.java
- Lines: 112 | Kind: integration (host JVM: real `RendererCredentialSlots` + upstream `SecureSlotPolicy`, `ResidentResultTransport`, `ResidentResultSession`, `HostedInbox`, `HostedResultNotices`, `HostedStorageFault`, `CloudDeployment` and the staged notice-owner sources; only the IPC channel and storage are in-memory) | Verdict: MERGE with `ResidentDeliveryTest.java` into one `ResidentResultDeliveryTest` (Gradle JVM `workflows-digest` suite; interim keep)
- Covers: renderer slot allowlist (native-only namespaces refused, renderer slots admitted); resident result IPC route denial, cursor/ack validation, owner/agent/session/expiry/401/oversize checks, close and 60 s expiry, late cancellation; commit-before-ack and lost-ack recovery; provisional-cancel replaced by native terminal and the refused replacements; session pinning (credential/device digest), restart adoption and the refusal of a different agent/session. Duplicates: `specs/quint/refinement/native/hosted-inbox.mjs` (+ `HostedInboxTraces.java`) replays inbox sync, ack and lost-ack recovery against the same classes; slot allowlist rows overlap `test/connection-routes.test.mjs` and the credential-coordinator Quint harness, which also compile `RendererCredentialSlots`. Callers/importers: `test/resident-result-transport.test.mjs` (both tests); `ResidentDeliveryTest.java` uses its `Channel` and `EXPIRES`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-47 | T4 | Slot-allowlist rows are a second home for `RendererCredentialSlots` policy, unrelated to result transport. | Move them to the one connection/credential JVM test that owns `RendererCredentialSlots`. | Low |
| 2 | 46 | A3 | Asserts `cloud-runtime:session` and `remote:https://agent.invalid` are admitted renderer slots. These are the paired/Cloud-runtime agent slots that C4 / Q-HOST-1 retire. | Drop these two rows when C4 lands. | Low |
| 3 | 65-74 | T4 | Lost-ack recovery and terminal replacement duplicate the hosted-inbox replay. | Keep only what the replay does not model (the refused-replacement table at line 71). | Low |
| 4 | 7-11, 33-42 | D8, C3 | Dense one-line helpers; `rejects` copied in `ResidentDeliveryTest`. | One helper set after the merge. | — |
| 5 | 6 | T8 | `EXPIRES=System.currentTimeMillis()+600000` ties the test to the wall clock. | Fixed epoch. | Low |

## Proposed end state
Merged with `ResidentDeliveryTest` into one host-JVM delivery test with checked-in stubs. Slot-policy rows move
to the credential test; inbox sync/ack cases already proven by `hosted-inbox.mjs` are removed; transport
identity checks, route denial, session pinning and restart adoption stay.
