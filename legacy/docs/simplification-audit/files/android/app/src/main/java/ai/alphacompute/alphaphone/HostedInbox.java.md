# android/app/src/main/java/ai/alphacompute/alphaphone/HostedInbox.java
- Lines: 43 | Role: Encrypted inbox of hosted/resident workflow results: index, page fetch, ack, pending notices and removal recovery. | Verdict: SIMPLIFY
- Importers: `HostedDelivery`, `HostedResultNotices`, `HostedTransport`, `ResidentResultSession`, `ResidentResultTransport`, `NativeDeviceEnrollmentKey`, `NativeNotificationSession`, `NativeOwnerReminderHost`, `AlphaLocalAgentPlugin` (uses `HostedInbox.id`/`Store`). Text/path pins: `scripts/test-android-notification-device-slot.ts`; `specs/quint/native/{NativeHostedInbox.qnt,README.md,manifest.json}`; `specs/quint/refinement/native/{HostedInboxTraces.java,deletion-coordinator,hosted-inbox,hosted-result-notices,native-digest-platform,resident-coordinator}.mjs`; `test/fixtures/ResidentResultTransportTest.java`, `test/native-deletion-review-fence.test.mjs`, `test/native-notification-device-slot.test.mjs`, `test/native-notification-session.test.mjs`, `test/notification-installation-root.test.mjs`, `test/notification-persist-owner-branches.test.mjs`, `test/resident-android-json-compile.test.mjs`, `test/resident-result-transport.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 11 | C1 | Local `Store` (read/write/remove) and `Fence` (check) interfaces; `HostedTransport.Guard`, `NativeDigestSources.Guard`, `HostedResultNotices.Storage` are the same shapes. | One `Slots` interface (store) and one `Guard` (check) shared by the Hosted*/Native* family. | low |
| 2 | 16 | C3/C6 | `id(...)` regex `[A-Za-z0-9][A-Za-z0-9_-]{0,127}` duplicated in `HostedResultNotices.sourceId:20` and `:37,82`. | Single `Ids.opaque128` helper; used by both. | none |
| 3 | 17, 19, 21-23, 31-33, 42 | D8 | Whole methods on one line (up to ~700 chars). | Formatter. | none |
| 4 | 31 | A8 | Trailing comment `// Preserve original bytes of every legacy/previous record.` | Reword without 'legacy' (it means: never rewrite an equivalent stored record). | none |
| 5 | 41 | - | `acceptsReconciledReplacement` is package-visible but only called in this file. | Make private. | none |
| 6 | 26, 38 | C6 | Slot prefix `"hosted-digests:v1:"` also in HostedDelivery:67, HostedResultNotices:38. | Constant. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Store | interface | 8 | HostedResultNotices.Storage:14, NativeDigestSources.Storage, GoogleWorkspaceReturnFlow.Store, SourceRenewalNotices.Store | shared Slots |
| Fence | interface | 11 | HostedTransport.Guard:11, NativeDigestSources.Guard, ResidentResultSession.Guard | shared Guard |
| Transport/DeliveryTransport | interfaces | 9-10 | - | stay |
| id | helper | 16 | HostedResultNotices.sourceId:20 | Ids |
| equivalent | helper | 42 | DeferredDeletionJournal.same (upstream JSON equality) | consider upstream same() |

## Proposed end state
Same algorithm; shared interfaces; after formatting ~120 physical lines but no logic removed. Logical size ~same. Estimated lines after: 40.

## Verification
Quint NativeHostedInbox; `test/resident-result-transport.test.mjs`; androidTest HostedProcessRestart.
