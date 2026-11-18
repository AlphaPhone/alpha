# specs/quint/refinement/native/WorkflowNoticeTraces.java
- Lines: 299 | Kind: Quint refinement driver (host JVM; compiles real `WorkflowNoticeDelivery`, `WorkflowNoticeTaps`, `WorkflowNoticeTapsFactory`, `WorkflowNoticePoster`, pinned upstream `NoticeDelivery/NoticeOwner/NoticeRoutes/NoticeCoordinator/HostNoticePoster/ForegroundNoticeGate`, and an `AlphaNotificationsPlugin` assembled by `workflow-notice-platform.mjs`) | Verdict: KEEP; PORT the bridge assembly
- Covers: model `WorkflowNoticeDelivery` (live): workflow step notifications. Route token persisted before the post, durable `applying` claim before the Android notify, foreground and owner fences, binding/run mismatch refusal, write faults before/after commit on route, claim, finish and retain slots, lost manager replies, late/hidden notices, permission denial and recheck after claim, owner withdrawal that survives an interrupted write. 14 traces. Duplicates: host test `test/workflow-notice-delivery.test.mjs` (javac test of the same classes) and Android instrumentation `WorkflowNoticeProcessDeath*` (device-level). Callers: `workflow-notice-delivery.mjs` (`javaTraces`); `index.mjs:48`; wrapper `test/quint-workflow-notice-delivery-refinement.test.mjs` (T4) and the native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `workflow-notice-delivery.mjs:53` | T10 | `workflowNoticePlatform(host, bridge)` builds the bridge from text of `AlphaNotificationsPlugin.java` and upstream `NotificationsHostPlugin.java` (see that file's report). This driver is otherwise source-faithful. | Port with the canonical-tap platform: compile the whole `AlphaNotificationsPlugin` against shared Capacitor/host stubs instead of slicing it. | Medium |
| 2 | 18-37 | C5 | Declares its own `AlphaCredentialStore`, `R` and `WorkflowPorts` stubs; the same `AlphaCredentialStore` slot-store stub is redeclared in about ten native platforms (action-recovery, clock-review, calendar-sync-enable, ...). | One `SlotStorePort.java` (`AlphaCredentialStore` backed by a map and a write hook) shared by native harnesses. | Low |
| 3 | 52-56 | C3 | Private SHA-256 hex loop. | Shared Java hash helper. | Low |
| 4 | 155 | dependency | Calls `WorkflowNoticeTapsFactory.delivery/create`. `delete-candidates.md` A63 merges `WorkflowNoticeTapsFactory` into `WorkflowNoticeTaps`, and `hosted-result-notices.mjs:85-89` stubs the same factory. | Update this call and the product list in `workflow-notice-delivery.mjs:21` in the same change as A63. | Medium (ordering) |
| 5 | — | dependency | `delete-candidates.md` B41 says `WorkflowNoticeDelivery` approval members are "tests and Quint only". This driver does not call `approvalTimeout/publishApproval/withdrawApproval/expireApprovals` (grep: no hits), so deleting them does not touch this campaign. | None. | — |
| 6 | 237-298 | D8 | Scenario bodies are one-line statement chains. | Formatter pass (D9). | None |

## Proposed end state
Same 14 traces over the real workflow notice classes and pinned shared notification core.
The bridge is compiled whole against shared stubs (no text assembly); slot store and hash helpers come from shared harness support.
Kept in sync with the `WorkflowNoticeTapsFactory` merge.
