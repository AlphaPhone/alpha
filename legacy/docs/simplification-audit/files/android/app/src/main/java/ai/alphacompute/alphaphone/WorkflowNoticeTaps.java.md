# android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeTaps.java
- Lines: 13 | Role: Alpha's slot names, actions and prefix for the shared `NoticeRoutes` tap ledger | Verdict: KEEP (absorb the factory's `create`)
- Importers: `WorkflowNoticeDelivery`, `WorkflowNoticePoster`, `WorkflowNoticeTapsFactory`; constants used by the manifest/intent filters; 5 androidTest files. Text/path pins: `test/fixtures/{WorkflowApprovalNoticeTest,WorkflowNoticeTapsTest}.java`, `test/workflow-*.test.mjs`, `specs/quint/services/WorkflowNoticeTaps.qnt`, `specs/quint/services/manifest.json`, `specs/quint/native/manifest.json`, `specs/quint/refinement/services/{index,workflow-local-source}.mjs`, `specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy`, `specs/lemma/README.md`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | D4 | Constructor parameter typed `WorkflowNoticeDelivery.Storage` (empty re-alias). | Type it `NoticeDelivery.Storage`. | Low (tests construct it 29×). |
| 2 | — | MERGE | `WorkflowNoticeTapsFactory.create(context)` belongs here. | Add `static WorkflowNoticeTaps create(Context)` here (see factory report). | Low. |
| 3 | 9-10 | C6 | Installed identities (slot names, actions, prefix) — keep byte-for-byte. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `SLOT`, `OWNER_SLOT`, `ACTION`, `ASK_ACTION`, `PREFIX`, `CONFIG` | const | 9-11 | manifest intent filters; `RendererCredentialSlots` namespaces | here |

## Proposed end state
~16 lines incl. `create(Context)`.

## Verification
`test/workflow-notice-delivery.test.mjs`, `WorkflowNoticeTapInstrumentedTest`, Quint services `WorkflowNoticeTaps`.
