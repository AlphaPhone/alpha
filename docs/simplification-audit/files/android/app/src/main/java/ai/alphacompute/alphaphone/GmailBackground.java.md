# android/app/src/main/java/ai/alphacompute/alphaphone/GmailBackground.java
- Lines: 35 | Role: Alpha binding for the shared background new-mail check: slot, Cloud key, reset fence, notice identifiers and scheduler. | Verdict: SIMPLIFY
- Importers: `AlphaGmailPlugin`, `GmailDeliveryWorker`. Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`; `specs/quint/refinement/native/{GmailBackgroundTraces.java,gmail-background*.mjs}`; `test/credential-slot-lock-order.test.mjs`, `test/gmail-background-binding.test.mjs`, `test/gmail-background-lock-contention.test.mjs` + `test/fixtures/GmailBackgroundLockContentionTest.java`, `test/gmail-lifecycle-custody.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-28 | C4 | Anonymous `MailBackgroundDelivery.Host` adapting `AlphaCredentialStore` (read/write/remove) plus lock/reset/identity. | Keep the Host (it carries more than storage) but take state access from `AlphaCredentialStore.asSlots()`. | low |
| 2 | 25 | C6 | Literal `"cloud:production"`. | Shared constant. | none |
| 3 | 14-16 | D3 | Two lazily created static singletons (`poster`, `delivery`). | Acceptable; fold into one `Holder` or Application-scoped service when D3 lands. | low |
| 4 | 21 | D3 | `AlphaLocalAgentPlugin.credentialLifecycleLock()` - lock lives on a plugin class. | Point at `CredentialAuthority` once extracted (research P2). | medium |
| 5 | whole | C5 | Research proposes merging with `GmailDeliveryWorker`. | Merge: worker becomes a nested `GmailBackground.Worker`? No - WorkManager stores the worker class name in its DB; renaming the class orphans enqueued work. Keep files separate; share the scheduling helper instead. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| SLOT | const | 11 | - | stay |
| NOTICES | const | 12-13 | WorkflowNoticePoster/HostedNoticePoster configs | stay |

## Proposed end state
~32 lines. Estimated lines after: 32.

## Verification
Gmail background Quint refinements; `test/gmail-background-*.test.mjs`.
