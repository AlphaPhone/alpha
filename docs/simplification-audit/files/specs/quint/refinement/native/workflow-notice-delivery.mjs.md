# specs/quint/refinement/native/workflow-notice-delivery.mjs
- Lines: 78 | Kind: Quint refinement harness (Java): whole product + upstream classes, sliced bridge methods via platform | Verdict: PORT (with platform) + SIMPLIFY
- Covers: model `WorkflowNoticeDelivery` (live) — workflow step notice: foreground gate, route claim, delivery claim before post, manager effect/lost replies, acknowledgement, owner withdrawal. Compiles product `WorkflowNoticeDelivery`, `WorkflowNoticeTaps`, `WorkflowNoticeTapsFactory`, `WorkflowNoticePoster` and upstream `NoticeDelivery/NoticeOwner/NoticeRoutes/NoticeCoordinator/HostNoticePoster/ForegroundNoticeGate` whole. Duplicates: `test/quint-workflow-notice-delivery-refinement.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-29 | B3 | Asserts `catalog.patches` is `[]` — `preparePatchedNative` already throws otherwise. | Delete. | L |
| 2 | 30,35-36,42-48 | B5 | Reads each upstream file through the staged copy, asserting staged == pinned == raw; with zero patches this is three hashes of one file. | Read `vendor/eliza/...` directly; one pinned check. | L |
| 3 | 26 | – | Requires `jsonJar` here while other harnesses tolerate its absence (`...(jsonJar?[jsonJar]:[])`). | Make all consistent (the JVM runner needs org.json anyway: require it in `java.mjs`). | L |
| 4 | 22 | A63 | `WorkflowNoticeTapsFactory` merges into `WorkflowNoticeTaps`/`WorkflowNoticeDelivery` per A63. | Update `product` list with the merge. | L |
| 5 | 61 | – | `javaTraces` (one JVM, all scenarios) — fine. | Keep. | – |

## Proposed end state
~50 lines: vendor sources compiled directly, product classes whole, bridge seam from the ported platform.
