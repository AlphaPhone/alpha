# android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticePoster.java
- Lines: 16 | Role: Alpha's channel IDs, copy, icon, tag prefix and actions for the shared `HostNoticePoster` | Verdict: KEEP (minor)
- Importers: `WorkflowNoticeTapsFactory`, `AlphaActionJournalPlugin`, 4 androidTest classes. Text/path pins: `test/context-selection.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{WorkflowNoticeTraces.java,action-recovery-platform.mjs,workflow-notice-delivery.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | D4 | `implements WorkflowNoticeDelivery.Poster` — the empty re-alias. | Implement `NoticeDelivery.Poster` (or nothing, if `HostNoticePoster` already does). | None. |
| 2 | 15 | D3 | Constructor builds a fresh `WorkflowNoticeTaps` via the factory on every token request (`id->WorkflowNoticeTapsFactory.create(context).token(id)`). | Fine (stateless over slots); after the factory merge it reads `WorkflowNoticeTaps.create(context)`. | None. |
| 3 | 9-14 | C6 | Channel IDs and copy are installed identities / user-visible text. | Keep byte-for-byte. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `CHANNEL`, `APPROVAL_CHANNEL`, `CONFIG` | const | 9-14 | `HostedNoticePoster` channels (other pipeline, P16) | here |

## Proposed end state
Unchanged (~16 lines).

## Verification
`WorkflowNoticeTapInstrumentedTest`, notification channel checks in device acceptance.
