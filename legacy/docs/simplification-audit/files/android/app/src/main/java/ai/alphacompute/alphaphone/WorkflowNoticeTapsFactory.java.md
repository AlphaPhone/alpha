# android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeTapsFactory.java
- Lines: 7 (line 4 is 330 characters) | Role: builds `WorkflowNoticeTaps` and `WorkflowNoticeDelivery` over an anonymous credential-store adapter | Verdict: MERGE (create → `WorkflowNoticeTaps`, delivery → `WorkflowNoticeDelivery`)
- Importers: `AlphaHostedResultsPlugin` (create ×5, delivery ×4), `AlphaNotificationsPlugin`, `WorkflowNoticePoster`; androidTest `WorkflowApprovalNoticeInstrumentedTest` (9), `WorkflowApprovalNoticeProcessDeathInstrumentedTest` (13), `WorkflowNoticeTapInstrumentedTest` (5), `WorkflowNoticeProcessDeathInstrumentedTest`, `WorkflowNoticeOwnerFixture`. Text/path pins: `test/native-deletion-admission.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{WorkflowNoticeTraces.java,hosted-result-notices.mjs,workflow-notice-delivery.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | C4 (P7) / D8 | Anonymous slot adapter on one line. | `store.asSlots()`. | Low. |
| 2 | 3-7 | D4 / MERGE (research §5) | A factory class for two one-line constructors. | Move `create` to `WorkflowNoticeTaps.create(Context)` and `delivery` to `WorkflowNoticeDelivery.create(Context)`; delete this file; update ~40 call sites (mostly androidTest) and the Quint manifest. | Low (mechanical). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `storage(Context)` | helper | 4 | 12 slot adapters | `AlphaCredentialStore.asSlots()` |

## Proposed end state
File removed.

## Verification
Workflow notice instrumentation suites above; Quint workflow-notice traces.
