# Chunk android-15 — summary

49 main-source Java files in `android/app/src/main/java/ai/alphacompute/alphaphone/` (K… to W…). Per-file reports are in
`docs/simplification-audit/files/android/app/src/main/java/ai/alphacompute/alphaphone/<Name>.java.md`.
`.eliza/client-features` was present and was grepped for upstream callers. `.eliza/generated-android` was not present.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| `android/app/src/main/java/ai/alphacompute/alphaphone/KeyboardDictationCloud.java` | SIMPLIFY | 105 | 70 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/KeyboardDictationPolicy.java` | SIMPLIFY | 40 | 40 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/LateLaunch.java` | KEEP | 21 | 21 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/LegacyCloudRecovery.java` | DELETE (owner P5) | 82 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/LocalAgentProviderAdmission.java` | KEEP | 6 | 6 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java` | SPLIT | 479 | 260 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeDeletionCoordinator.java` | SIMPLIFY | 57 | 45 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeDeviceEnrollmentKey.java` | SIMPLIFY | 24 | 15 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeDigestHost.java` | SIMPLIFY | 41 | 35 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeDigestSources.java` | SIMPLIFY | 87 | 80 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeNotificationDiagnostics.java` | SIMPLIFY | 25 | 18 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeNotificationSession.java` | SIMPLIFY | 75 | 55 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeOwnerReminderHost.java` | SIMPLIFY | 96 | 75 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeReadEpoch.java` | DELETE | 11 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NativeVoiceBinding.java` | SIMPLIFY (absorbs VoiceEventAdmission) | 11 | 16 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NavigationOpenRequest.java` | MERGE into MainActivity | 14 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NoteSourceReferences.java` | KEEP | 21 | 20 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NotesDeletionLease.java` | KEEP | 32 | 28 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/NotificationAccess.java` | SIMPLIFY | 30 | 10 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/OwnerRoutes.java` | SIMPLIFY | 16 | 7 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/PairedAgentCredential.java` | DELETE (owner P15) | 34 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/PairedSpeechContract.java` | DELETE (owner P15) | 15 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/PasswordProviderSupport.java` | KEEP | 66 | 62 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/PluginWorkers.java` | KEEP | 20 | 15 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/PreparedViewNavigation.java` | KEEP | 21 | 20 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ReminderReceiver.java` | KEEP | 8 | 8 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/RendererCredentialSlots.java` | SIMPLIFY | 40 | 30 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/RendererRecoveryBudget.java` | SIMPLIFY | 80 | 50 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResetBeforeDispatch.java` | SIMPLIFY (owner P5) | 77 | 45 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResetRecoveryActivity.java` | KEEP | 18 | 18 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentCredentialShutdownRetry.java` | SIMPLIFY | 21 | 14 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentRecoveryReview.java` | KEEP | 13 | 13 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentResultSession.java` | SIMPLIFY | 93 | 75 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentResultTransport.java` | SIMPLIFY | 67 | 55 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentScheduleRearm.java` | SIMPLIFY | 60 | 35 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ResidentScheduleReceiver.java` | KEEP | 34 | 28 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ReviewedCopies.java` | KEEP | 76 | 76 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/SelectedDocumentAccess.java` | SIMPLIFY | 41 | 18 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/SerialStorageTasks.java` | KEEP | 22 | 22 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/SmsActionJournalResult.java` | SIMPLIFY | 37 | 45 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/SourceRenewalHost.java` | MERGE into SourceRenewalNotices | 7 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/SourceRenewalNotices.java` | SIMPLIFY | 50 | 65 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/UpdateConfirmationReceipt.java` | KEEP (MOVE to update/) | 123 | 120 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/VoiceEventAdmission.java` | MERGE into NativeVoiceBinding | 10 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeDelivery.java` | SIMPLIFY | 47 | 20 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticePoster.java` | KEEP | 16 | 16 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeTaps.java` | KEEP | 13 | 16 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowNoticeTapsFactory.java` | MERGE | 7 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowWorkerAssets.java` | SIMPLIFY | 118 | 95 |
| **Total** (physical lines; formatting packed lines raises physical counts, so the removable-line estimate is conservative) | | 2507 | 1762 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| owner-session `/api/auth/me` check | inline helper | NativeNotificationSession.java:60-63 | NativeOwnerReminderHost.java:70-74, ResidentResultSession.java:53-55, ResidentResultTransport.java:45-49, partial AlphaLocalAgentPlugin.java:1186 | new `ResidentOwner.requireOwnerSession` |
| single-running-agent check | inline helper | NativeNotificationSession.java:64-69 | ResidentResultSession.java:56-60, ResidentResultTransport.java:50-52, NativeOwnerReminderHost.java:78-80 (different subsets) | `ResidentOwner.requireRunningAgent` |
| `PLACEHOLDER_AGENT` | const | ResidentResultSession.java:13 | used by NativeNotificationSession.java:68 | `ResidentOwner` |
| bearer-token shape check | inline helper | KeyboardDictationCloud.java:75 | PairedAgentCredential:12, NativeNotificationSession:54, ResidentResultSession:17,46, AlphaVoiceCloudPlugin:202, AlphaLocalAgentPlugin:1145,1292, CalendarSyncSnapshot:86 | `Ids.bearer(token,max)` |
| safe-integer (0..2^53-1) check | helper | NativeNotificationSession.java:34-40 | ResidentResultTransport:63, HostedInbox:17, SmsActionJournalResult:22 | `Json.safeInteger` |
| exact-key-set check | helper | NativeDigestSources.java:34 | NativeDigestHost:18-19, NativeNotificationSession:19, PreparedViewNavigation:14-15, ResidentResultTransport:61, SourceRenewalNotices:19 | `Json.requireExactKeys` |
| UUID / sha256-hex regexes | inline | NativeNotificationSession.java:24,51 | PairedAgentCredential:23, NativeOwnerReminderHost:84, ResidentResultSession:77, 17x `[a-f0-9]{64}` in main | `Ids.uuid`, `Ids.sha256Hex` |
| SHA-256 hex | helper | WorkflowWorkerAssets.java:26-27 | HostedResultNotices.hash (used by 8 files in this chunk), AlphaDevicePlugin x4, AlphaCredentialStore:159, CalendarSyncSnapshot:140, GoogleWorkspaceReturnFlow:33 | `Digests` util |
| bounded stream read | inline/helper | KeyboardDictationCloud.java:92-99, WorkflowWorkerAssets.java:28-32 | AlphaDevicePlugin:202-205, AlphaLocalAgentPlugin:595-603, AlphaVoiceCloudPlugin:164, HostedTransport:30, AlphaNoteRecorder:121 | `BoundedIo.read` |
| Cloud STT multipart upload | inline | KeyboardDictationCloud.java:72-102 | AlphaVoiceCloudPlugin.java:~200-240 | `CloudStt.upload` |
| exception family / status clamp | helper | NativeNotificationDiagnostics.java:7,12,23 | AlphaLocalAgentPlugin.java:28,30-35 | `Diagnostics` |
| `Guard { void check() }` | interface | NativeDigestSources.java:15 | ResidentResultSession:14, ResidentCredentialShutdownRetry:5, HostedInbox.Fence, HostedTransport.Guard, AlphaCanonicalNotifications.ForegroundCheck | one shared `Guard` |
| slot read/write interface | interface | NativeDigestSources.java:10 | SourceRenewalNotices.Store:11, WorkflowNoticeDelivery.Storage:13 (empty alias), HostedInbox.Store, HostedResultNotices.Storage, GoogleWorkspaceReturnFlow.Store | shared slots interface; `AlphaCredentialStore.asSlots()` |
| anonymous credential-store adapters | adapter | NativeDeletionCoordinator.java:26-29 | NativeDigestHost:11, SourceRenewalHost:6, WorkflowNoticeTapsFactory:4, NativeOwnerReminderHost:18-23 (+7 outside chunk) | `AlphaCredentialStore.asSlots()` |
| `Probe`/`Clock`/`Pause` | interface | ResidentCredentialShutdownRetry.java:6-8 | JDK `Callable<Boolean>`, `LongSupplier` | JDK types |
| `Ports` | interface | NativeOwnerReminderHost.java:8-13 | NativeNotificationSession.Ports:9-16 | keep separately (different members) |
| `WorkflowNoticeDelivery.Storage/Poster` | empty alias interface | WorkflowNoticeDelivery.java:13-14 | NoticeDelivery.Storage/Poster (upstream) | delete; use upstream |
| `OwnerRoutes.Assets` | empty alias interface | OwnerRoutes.java:7 | OwnerRoutePolicy.Assets | delete |
| `"local-agent-provider:v1"` | literal | KeyboardDictationCloud.java:33,51 | LocalAgentProviderAdmission.PROVIDER_SLOT, AlphaLocalAgentPlugin x4, AlphaVoiceCloudPlugin x4, LegacyCloudRecovery:12, generated CloudDeployment.java:26 | `LocalAgentProviderAdmission.PROVIDER_SLOT` |
| `"https://device.alpha.invalid"` | literal | NativeOwnerReminderHost.java:43 | SourceRenewalNotices.java:46 | `NativeDeviceEnrollmentKey.LOCAL_ORIGIN` |
| binding fields `ownerId,agentId,installationId,enrollmentId` | inline const | NativeDigestHost.java:15,21 | NativeDigestSources.java:61, SourceRenewalNotices.java:19,26,48 | `NativeDigestSources.BINDING_FIELDS` |
| slot namespaces list | const | RendererCredentialSlots.java:13-23 | per-owner SLOT constants (NativeDeletionCoordinator, WorkflowNoticeTaps, NativeNotificationSession, SourceRenewalNotices…), AlphaCredentialStore.slotLimit | `Slots` registry |
| `ACTION_*` Settings / Intent constants | const | RendererRecoveryBudget.java:23-25, ResidentScheduleRearm.java:14-17 | android.provider.Settings, android.content.Intent | Android constants (after javac tests go) |
| Settings/HOME choice helpers | helper | RendererRecoveryBudget.java:63-79 | used by AlphaDeviceAppsPlugin:24; aosp AlphaWelcome.java:55,122 | `HomeSettings` |
| lazy `static synchronized get()` singletons | helper | NativeDeletionCoordinator.java:22, SourceRenewalHost.java:6, NoteSourceReferences.java:17, SelectedDocumentAccess.java:22 | 3 more outside chunk | keep pattern |
| closed-bridge strategies | helper | PluginWorkers.java:16, LateLaunch.java:17, SerialStorageTasks.java:10 | raw `catch(RejectedExecutionException)` in 7 files | Alpha base plugin (P10/P18) |
| `VoiceEventAdmission.current` | helper | VoiceEventAdmission.java:6 | NativeVoiceBinding.current | `NativeVoiceBinding` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `NativeReadEpoch.java` | 0 references under `android/`; only `test/native-read-epoch.test.mjs`, `test/fixtures/NativeReadEpochTest.java`, Quint manifest/ComponentTraces | high |
| `MainActivity.java:355` `registerPlugin(AlphaListenerPlugin.class)` (+ `AlphaListenerPlugin.java`) | `"AlphaListener"` 0 hits in `apps/` and `.eliza/client-features` | high |
| `NotificationAccess` forwards `component, apps, list, history, action, redact, clearHistoryBoundary`, `LOCK` | 0 hits in android/, test/, specs/ | high |
| other `NotificationAccess` forwards (prefs, granted, listener, eventGeneration, signature, status, update) | androidTest-only; production uses `MIRROR` and `pause` | high (mechanical test edit) |
| `SelectedDocumentAccess.shareUri` | 0 callers | high |
| `SelectedDocumentAccess.read`, `selections`, `initialize` | instrumentation-only / identical to `documents()` | high |
| `WorkflowNoticeDelivery.approvalTimeout`, `publishApproval`, `withdrawApproval(id,now)`, `expireApprovals` | no caller in `android/app/src/main`; tests/Quint only | high |
| `WorkflowNoticeDelivery.Storage/Poster`, `OwnerRoutes.Assets` empty alias interfaces | aliases of upstream types | high |
| `NativeDigestSources` 7-arg `read` overload, 2-constructor split | test-only callers | high |
| `RendererCredentialSlots` 3 forwards + `nativeNamespaces()` | forwards to `POLICY`; `nativeNamespaces` used only by `ConnectionInstrumentedTest` | high |
| `NativeDigestHost.java:26` unreachable action re-check | action restricted at :18 and describe returned at :25 | high |
| `WorkflowWorkerAssets` zero-read branches (:30, :68) and null `packageStamp` branches | `InputStream.read(byte[])` contract; own-package `NameNotFoundException` impossible | medium |
| `LegacyCloudRecovery.java` + legacy step in `ResetBeforeDispatch` (32,37,42-58) + `AlphaCredentialStore` legacy branches | pre-namespace data cannot exist in the renamed package (PRD 55-58) | medium — owner decision P5 |
| `PairedAgentCredential.java`, `PairedSpeechContract.java`, `NativeDeviceEnrollmentKey.cloud` | PRD: no hosted-agent pairing; cloud-runtime only under test mocks | medium — owner decision P15 |
| `MainActivity` PasswordTransfer reflective registration (358-362) | password transfer PRD-excluded; renderer client test-mocks only | medium — owner decision |
| `isAssistantSurface()` and its 11 conjuncts in `MainActivity` | only override is disabled `AlphaAssistActivity` | medium — owner decision P-78 |
| `NativeDeletionCoordinator` unversioned-target branch (:48 else, :51) | no product writer of version-1 targets found; upstream path unverified | low |
| `NativeDigestSources` `at` fallback for `legacyAlarm` rows (:79-80) | upstream reminders still declare `legacyAlarm` | low |

## Cross-file actions
1. **`ResidentOwner` helper** (owner-session + running-agent checks): `NativeNotificationSession.java`, `NativeOwnerReminderHost.java`, `ResidentResultSession.java`, `ResidentResultTransport.java`, optionally `AlphaLocalAgentPlugin.java:1186`; tests `test/native-notification-session.test.mjs`, `test/resident-result-transport.test.mjs`, `test/native-deletion-review-fence.test.mjs`, Quint `resident-coordinator.mjs`, `hosted-inbox.mjs`, `deletion-coordinator.mjs`. Decide one rule for the placeholder-agent check and for `expiresAt` equality vs `<= now`.
2. **Shared `Ids`/`Json`/`Digests`/`BoundedIo` util** in one Java util class: every file listed in "Local types and helpers" rows for token, safe-integer, exact-keys, UUID/hex, SHA-256, bounded read.
3. **Shared slots interface + `AlphaCredentialStore.asSlots()`**: `NativeDeletionCoordinator`, `NativeDigestHost`, `NativeDigestSources`, `SourceRenewalHost`, `SourceRenewalNotices`, `WorkflowNoticeTapsFactory`, `WorkflowNoticeDelivery`, `WorkflowNoticeTaps`, `NativeOwnerReminderHost`, `AlphaCredentialStore` (+ out-of-chunk `HostedInbox`, `HostedResultNotices`, `GoogleWorkspaceReturnFlow`, `AlphaReminders`, `AlphaTelephony`, …); tests constructing `new X.Storage(){…}` (`NativeDigestSourcesTest`, `Workflow*Test`, androidTest workflow suites).
4. **Shared `Guard` interface**: `NativeDigestSources`, `ResidentResultSession`, `ResidentCredentialShutdownRetry`, `HostedInbox`, `HostedTransport`, `AlphaCanonicalNotifications`; rename `SourceRenewalNotices.Guard` to `Source`.
5. **Cloud STT upload helper**: `KeyboardDictationCloud.java` + `AlphaVoiceCloudPlugin.java`; Quint `keyboard-dictation-cloud.mjs` and voice cloud traces.
6. **Legacy Cloud recovery removal (P5)**: `LegacyCloudRecovery.java`, `ResetBeforeDispatch.java`, `AlphaCredentialStore.java` (79-80,105,135,180,196-216,239, `readLegacySlotBeforeAttach`), `AlphaCloudSignInPlugin.java:74-125`, renderer callers of `savedSignInRecoveryStatus/restoreSavedSignIn`, `scripts/cloud-deployment.ts:96` message, `RendererCredentialSlots` (`cloud-signin` journal), tests `test/legacy-cloud-recovery.test.mjs`, `test/fixtures/legacy-cloud-recovery/*`, `test/reset-cloud-revocation.test.mjs`, `test/reset-wiring.test.mjs`, `test/power-cold-native-pin.test.mjs`, Quint `credential-coordinator.mjs`, `saved-sign-in-recovery.mjs`, `refinement/services/credentials.mjs`.
7. **Paired/Cloud-hosted agent removal (P15)**: `PairedAgentCredential.java`, `PairedSpeechContract.java`, `NativeDeviceEnrollmentKey.cloud`, paired methods in `AlphaVoiceCloudPlugin`, `HostedDelivery` remote/cloud modes, `apps/app/src/runtime/paired-voice.ts`, `scripts/android-browser-reading-live.ts`, `test/paired-speech-contract.test.mjs`, `test/campaign-speech-routes.test.mjs`, `Paired*` androidTest.
8. **Merge tiny files**: `VoiceEventAdmission` → `NativeVoiceBinding` (+4 `AlphaLocalAgentPlugin` sites); `SourceRenewalHost` → `SourceRenewalNotices` (+`AlphaHostedResultsPlugin` x6, `HostedDeliveryWorker`); `WorkflowNoticeTapsFactory` → `WorkflowNoticeTaps.create` / `WorkflowNoticeDelivery.create` (+`AlphaHostedResultsPlugin`, `AlphaNotificationsPlugin`, `WorkflowNoticePoster`, ~35 androidTest sites, `WorkflowNoticeTraces.java`); `NavigationOpenRequest` → nested in `MainActivity`. Each needs `specs/quint/native/manifest.json` and `test/support/feature-parity.mjs` updates.
9. **MainActivity split**: `MainActivity.java` → `HomeInstanceHandoff`, `RendererEscapeView`, `SystemInsetsBridge`; `RendererRecoveryBudget` Settings/HOME helpers → `HomeSettings` (also `AlphaDeviceAppsPlugin:24`); update `test/gesture-zones-single-instance.test.mjs`, `test/renderer-recovery-budget.test.mjs`, Quint `MainActivityRecoveryTraces.java`, `HomeInstanceHandoffReplay.java`, `main-activity-platform.mjs`, `test/fixtures/app-update-jvm/.../MainActivity.java`.
10. **P-78 retirement** (if decided): `MainActivity.isAssistantSurface` + conjuncts, `AlphaDevicePlugin:268`, `AlphaLocalAgentPlugin:516`, `AlphaAssistActivity`, `test/power-sense-entry.test.mjs`, `AssistantInstrumentedTest`, Quint `AssistantEntryTraces.java`.
11. **Provider-slot literal**: replace `"local-agent-provider:v1"` in `KeyboardDictationCloud`, `AlphaLocalAgentPlugin`, `AlphaVoiceCloudPlugin` with `LocalAgentProviderAdmission.PROVIDER_SLOT`.
12. **Plugin closed-bridge unification (P10/P18)**: `PluginWorkers`, `LateLaunch`, `SerialStorageTasks` + raw `RejectedExecutionException` catches in `AlphaGmailPlugin`, `AlphaDeletionsPlugin`, `CalendarScopedDeletionReview`, `AlphaCalendarPlugin`, `CalendarSyncBridge`, `AlphaMapsTransportPlugin`; upstream base-plugin change needs a pinned `vendor/eliza` commit.
13. **`packageStamp` required**: `WorkflowWorkerAssets.java` (36,53,79) + `AlphaLocalAgentPlugin.java:624-626`.

## Text/path pins
- `specs/quint/native/manifest.json` pins symbols in most of these files (MainActivity 35 pins; also NativeReadEpoch, NativeVoiceBinding, VoiceEventAdmission, WorkflowNotice*, SourceRenewal*, RendererRecoveryBudget `settingsAction`/`homeChoiceAction`, ResidentScheduleRearm, ReviewedCopies, ResidentCredentialShutdownRetry, ResidentRecoveryReview, PasswordProviderSupport, SelectedDocumentAccess, KeyboardDictation*). `specs/quint/services/manifest.json`: LocalAgentProviderAdmission, ResidentCredentialShutdownRetry, SerialStorageTasks, WorkflowNoticeDelivery/Taps. `specs/quint/application/manifest.json`: MainActivity, NotesDeletionLease, NotificationAccess, PasswordProviderSupport.
- `test/support/feature-parity.mjs` names every file in this chunk.
- javac host tests (compile the file directly): `test/keyboard-dictation.test.mjs`, `test/native-read-epoch.test.mjs`, `test/notes-deletion-lease.test.mjs`, `test/native-live-pcm.test.mjs`, `test/maps-notification-open.test.mjs`, `test/resident-recovery-review.test.mjs`, `test/resident-credential-shutdown-retry.test.mjs`, `test/plugin-worker-guard.test.mjs`, `test/serial-storage-tasks.test.mjs`, `test/sms-action-journal.test.mjs`, `test/source-renewal-notices.test.mjs`, `test/native-digest-sources.test.mjs`, `test/native-notification-session.test.mjs`, `test/resident-result-transport.test.mjs`, `test/renderer-recovery-budget.test.mjs`, `test/reset-cloud-revocation.test.mjs`, `test/workflow-notice-delivery.test.mjs`, `test/workflow-approval-notice.test.mjs`, `test/workflow-worker-assets.test.mjs`, `test/paired-speech-contract.test.mjs`, `test/legacy-cloud-recovery.test.mjs`, with fixtures under `test/fixtures/*Test.java`.
- Source-text/regex tests: `test/gesture-zones-single-instance.test.mjs` (exact MainActivity lines), `test/notes-deletion-lease.test.mjs` (slices AlphaNoteAudioPlugin, regexes renderer constant), `test/resident-recovery-review.test.mjs` and `test/resident-credential-shutdown-retry.test.mjs` (slice AlphaLocalAgentPlugin), `test/product-character-host.test.mjs` (WorkflowWorkerAssets / LocalAgentProviderAdmission), `test/native-notification-device-slot.test.mjs` (calls `NativeOwnerReminderHost.deviceSlot`), plus ~30 MainActivity regex tests listed in its report.
- Quint refinement Java harnesses compiling these classes: `specs/quint/refinement/native/{MainActivityRecoveryTraces,HomeInstanceHandoffReplay,RendererBackgroundRebuildReplay,KeyboardDictation*Traces,NativeDigestTraces,SourceRenewalTraces,WorkflowNoticeTraces,DeletionCoordinatorTraces,DeletionTestPorts,ReviewedCopiesTraces,ComponentTraces,FinitePolicyTraces,ResidentScheduleAdmissionTraces,CanonicalTapTraces,HostedInboxTraces}.java`.
- Scripts: `scripts/cloud-deployment.ts` (generates `CloudDeployment.java`, names LegacyCloudRecovery, emits the provider-slot literal), `scripts/test-android-notification-device-slot.ts` (NativeDeviceEnrollmentKey/Diagnostics/OwnerReminderHost), `scripts/test-update-confirmation-platform.ts`, `scripts/android-browser-reading-live.ts` (PairedSpeechContract), `scripts/android-instrumentation.ts`, `scripts/apk.ts`, `scripts/verify-apks.ts`, `scripts/pilot-update.ts` (MainActivity), `scripts/stage-native-apps.ts` (Proton certificate digest).
- `specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy` and `specs/lemma/README.md` name `WorkflowNoticeTaps`.
- `LemmaScript-files.txt`: no hits for these files.

## New patterns
- **NEW — Copy-pasted security verification blocks**: the resident owner-session (`/api/auth/me`) and running-agent checks are duplicated 4–5 times with slightly different subsets (placeholder-agent check present in 2 of 4; `expiresAt` checked by equality in 3 and by `<= now` in 1). This is C3, but the drift makes it a correctness risk, not only duplication. Treatment: one verifier per protocol response, with a single strictness rule.
- **NEW — Constant re-declaration to keep classes Android-free** (D7 variant): Android SDK constants re-typed as literals or magic numbers (`Settings.ACTION_*`, `Intent.ACTION_*`, `InputType` masks) only so host javac tests compile without stubs.

## Owner questions
1. P5: can every pre-namespace/legacy reader go (`LegacyCloudRecovery`, `ResetBeforeDispatch` legacy step), i.e. did no pilot install a pre-namespace build of `ai.alphacompute.alphaphone`?
2. P15: are paired (`remote:`) and Cloud-hosted (`cloud-runtime:`) agents and paired speech a product feature, a dev surface behind test mocks, or deleted?
3. P-78: retire `AlphaAssistActivity` (and with it `MainActivity.isAssistantSurface` branches)?
4. Is the dev-only `PasswordTransferPlugin` registration a retained developer surface (DECISIONS.md) or deleted with the transfer client?
5. Does upstream still produce unversioned Calendar deletion targets and reminder rows without `dueAt` (`legacyAlarm`)? If not, delete those fallbacks.
6. Unifying owner checks: should all resident owner verifications reject the placeholder agent and require exact `expiresAt` equality?
7. Test strategy: may the javac host tests and Quint Java harnesses that pin tiny classes (NativeReadEpoch, NavigationOpenRequest, VoiceEventAdmission, ResidentCredentialShutdownRetry) be removed or rewritten together with the merges?
