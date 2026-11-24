# android/app/src/main/java/ai/alphacompute/alphaphone/HostedResultNotices.java
- Lines: 119 | Role: Durable redacted notice ledger for hosted results: publish, supersede, withdraw, tap capture/consume, owner fence; also the codebase's de-facto SHA-256 helper. | Verdict: SIMPLIFY
- Importers: 18 main classes (AlphaCanonicalNotifications, AlphaHostedResultsPlugin, AlphaLocalAgentPlugin, CalendarSyncBridge, HostedDelivery/Worker/Inbox/NoticePoster/Transport, NativeDeviceEnrollmentKey, NativeDigestSources, NativeNotificationSession, NativeOwnerReminderHost, ResidentResultSession, SourceRenewalNotices ...), mostly for `hash`. Text/path pins: `scripts/test-android-notification-device-slot.ts`; `specs/quint/native/{NativeHostedResultNotices.qnt,manifest.json}`; `specs/quint/refinement/native/{HostedInboxTraces.java,HostedResultNoticeTraces.java,NativeDigestTraces.java,SourceRenewalTraces.java,calendar-sync-enable,deletion-coordinator,hosted-inbox,hosted-result-notices,native-digest-platform,resident-coordinator,source-renewal-platform,source-renewal}.mjs`; `test/fixtures/{HostedNoticeWithdrawTest,HostedResultNoticesTest,NativeDigestSourcesTest,NativeNotificationSessionTest,ResidentDeliveryTest,ResidentResultTransportTest}.java`; `test/hosted-notice-withdraw.test.mjs`, `test/hosted-result-notices.test.mjs`, `test/native-deletion-review-fence.test.mjs`, `test/native-digest-sources.test.mjs`, `test/native-notification-*.test.mjs`, `test/resident-*.test.mjs`, `test/source-renewal-notices.test.mjs`; androidTest Hosted*; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31 | C3/D11 | `static String hash(String)` (SHA-256 hex via `String.format`) is used by ~18 unrelated classes (Calendar sync, credentials, device enrollment). | Move to `Digests.sha256Hex` in a util class; keep `HostedResultNotices.hash` as a call or update all callers (cross-file). Output must stay lower-case hex - it is persisted in scopes, digests and keys. | low |
| 2 | 14 | C1 | `Storage` (read/write) interface duplicates `HostedInbox.Store` minus `remove`; HostedDelivery builds an adapter from one to the other. | Take `HostedInbox.Store` (or shared `Slots`). | low |
| 3 | 15 | D4 | `Poster` interface with default `post(key,silent){post(key);}`. | Single `post(key,silent)` method. | low |
| 4 | 75-77 | D7 | `capture(String key)` 1-arg overload: callers are only `test/fixtures/HostedNoticeWithdrawTest.java`, `HostedResultNoticesTest.java` (grep: no main caller). | Delete; tests call `capture(key,false)`. | none |
| 5 | 20, 29, 37, 80, 82, 90 | C3 | Inline id/scope regexes `[A-Za-z0-9][A-Za-z0-9_-]{0,127}` and `[a-f0-9]{64}` (6×). | `Ids` helpers. | none |
| 6 | 25, 38 | C6 | Slot names `hosted-notices:v1`, `hosted-notices:pending:v1`, `hosted-notices:owner:v1`, `hosted-digests:v1:`. | Keep values; the `hosted-digests` prefix should share HostedInbox's constant. | none |
| 7 | 99 | B1 | `catch(Exception missing){out.put("retained",false);}` | Specified (missing result shown as not retained); keep. | none |
| 8 | 47-49, 66-69 | D8 | Multi-statement lines. | Formatter. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Storage | interface | 14 | HostedInbox.Store:8 | shared Slots |
| Poster | interface | 15 | HostedNoticePoster only impl (+ test stubs) | stay, one post method |
| hash | helper | 31 | CalendarSyncSnapshot.digest, GoogleWorkspaceReturnFlow.credentialHash, AlphaDevicePlugin x4, WorkflowWorkerAssets, AlphaCredentialStore:159 | Digests util |
| sourceId | helper | 20 | HostedInbox.id:16 | Ids |
| renewalDelay/renewalTimeout | helpers | 22-24 | - | stay |

## Proposed end state
Ledger logic unchanged; hash moved out (or delegating); 1-arg capture removed; ~110 lines. Estimated lines after: 110.

## Verification
Quint NativeHostedResultNotices; host tests listed; androidTest HostedResultNotice.
