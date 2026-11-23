# android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeDelivery.java
- Lines: 47 | Role: Alpha's slot names, redacted approval copy and bounds for the shared `NoticeDelivery` receipt ledger, plus forwards to it and to `NoticeCoordinator` | Verdict: SIMPLIFY
- Importers: main `AlphaHostedResultsPlugin` (approvalId ×2, publish, postApproval, withdrawApproval(taps,…), withdrawOtherOwners ×3, resumeApproval via `WorkflowNoticeTapsFactory.delivery`), `AlphaActionJournalPlugin` (`new WorkflowNoticeDelivery`, `receipt`), `AlphaNotificationsPlugin` (`CONFIG`), `WorkflowNoticeTaps`, `WorkflowNoticePoster`, `WorkflowNoticeTapsFactory`; 5 androidTest files. Text/path pins: `test/fixtures/{WorkflowApprovalNoticeTest,WorkflowNoticeDeliveryTest,WorkflowNoticeRecoveryTest,WorkflowNoticeTapsTest}.java`, `test/workflow-notice-delivery.test.mjs`, `test/workflow-approval-notice.test.mjs`, `specs/quint/native/{WorkflowNoticeDelivery.qnt,manifest.json}`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/{WorkflowNoticeTraces.java,action-recovery*.mjs,workflow-notice-delivery.{md,mjs}}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-14 | D4 / C1 (P7, P17) | `interface Storage extends NoticeDelivery.Storage {}` and `interface Poster extends NoticeDelivery.Poster {}` — empty re-aliases. | Delete; use the upstream types in `WorkflowNoticeTaps`, `WorkflowNoticePoster`, `WorkflowNoticeTapsFactory`, `AlphaActionJournalPlugin` and the tests. | Low (mechanical, many test files). |
| 2 | 28, 32, 38, 46 | A7 / D7 | `approvalTimeout`, `publishApproval`, 2-arg `withdrawApproval(id,now)`, `expireApprovals` have no production caller (git grep `android/app/src/main`: only this file); used by `test/fixtures/WorkflowApprovalNoticeTest.java`/Quint traces. | Delete the forwards; tests call `NoticeDelivery` directly. | Low. |
| 3 | 25-44 | D4 (P17) | The remaining methods are one-line forwards to `shared` or `new NoticeCoordinator(shared,taps)`. | Option A (preferred): reduce this class to constants (`SLOT`, `APPROVAL_SLOT`, copy, bounds, `CONFIG`) and a `static NoticeDelivery create(Context)`; callers use `NoticeDelivery`/`NoticeCoordinator`. Option B: keep the facade but only with the 6 production methods. | Medium: Quint `WorkflowNoticeTraces.java` and 4 javac fixtures construct it. |
| 4 | 24 | D4 | `approvalId(id)` forwards to `NoticeDelivery.approvalId`. | Callers use upstream. | None. |
| 5 | 19-22 | C6 | Persisted slot names and user-visible approval copy — must stay byte-for-byte. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Storage` | interface | 13 | `NoticeDelivery.Storage` + 5 product slot interfaces | deleted |
| `Poster` | interface | 14 | `NoticeDelivery.Poster` | deleted |
| `SLOT`, `APPROVAL_SLOT` | const | 20 | `RendererCredentialSlots.NATIVE_NAMESPACES` | here |
| `CONFIG` | const | 23 | — | here |

## Proposed end state
~20 lines: constants, `CONFIG`, and the factory moved from `WorkflowNoticeTapsFactory.delivery`. Stored formats unchanged (upstream).

## Verification
`test/workflow-notice-delivery.test.mjs`, `test/workflow-approval-notice.test.mjs`, Quint workflow-notice-delivery refinement,
`WorkflowApprovalNotice*InstrumentedTest`, `WorkflowNoticeTapInstrumentedTest`.
