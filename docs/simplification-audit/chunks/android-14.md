# Chunk android-14: per-file review summary

Reports: `docs/simplification-audit/files/android/app/src/main/java/ai/alphacompute/alphaphone/<Name>.java.md` (49 files).

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNoteRecordingService.java` | KEEP | 134 | 134 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNotificationListener.java` | KEEP | 9 | 9 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaNotificationsPlugin.java` | SIMPLIFY | 62 | 58 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPhotoLibraryPlugin.java` | KEEP | 20 | 20 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPhotosPlugin.java` | SIMPLIFY | 32 | 24 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPowerVoiceActivity.java` | DELETE (owner decision P-78) | 21 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaQuickSettingsTile.java` | DELETE (owner decision P-78) | 42 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaReminders.java` | SIMPLIFY | 31 | 22 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaResetPlugin.java` | KEEP | 14 | 14 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaSmsSendReceiver.java` | KEEP | 19 | 19 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaSystemPlugin.java` | SIMPLIFY | 79 | 66 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephony.java` | SIMPLIFY | 34 | 26 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaTelephonyPlugin.java` | KEEP | 58 | 55 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaUpdateStatusReceiver.java` | MOVE to update/ package (with the AlphaDevicePlugin updater split) | 55 | 55 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaVoiceCloudPlugin.java` | SPLIT | 349 | 190 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarAvailabilityJournalResult.java` | KEEP | 63 | 60 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarCreationStore.java` | DELETE | 13 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarDeletionIdentity.java` | KEEP (owner check on numeric form) | 30 | 30 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarScopedDeletionReview.java` | SIMPLIFY | 87 | 70 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncBridge.java` | SPLIT | 232 | 190 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncConsent.java` | KEEP | 43 | 42 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncFreshness.java` | KEEP | 49 | 47 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncMutation.java` | SIMPLIFY | 89 | 80 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncReceiptRecovery.java` | KEEP | 34 | 34 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarSyncSnapshot.java` | KEEP | 141 | 135 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CalendarZones.java` | MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCalendarPlugin.java | 13 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ClockAgentReview.java` | SIMPLIFY | 106 | 98 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CloudDeployment.java` | SIMPLIFY (in the generator) | 28 | 22 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CloudSpeechPolicy.java` | KEEP | 18 | 18 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/CloudVoiceLimit.java` | KEEP (absorb parsing from AlphaVoiceCloudPlugin) | 100 | 115 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/ConnectionRoutes.java` | SIMPLIFY | 44 | 25 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/DailyAppsPlugin.java` | SIMPLIFY | 235 | 215 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/DeletionReviewAdmission.java` | KEEP | 15 | 15 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/DeletionWorker.java` | KEEP | 10 | 10 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/GmailBackground.java` | SIMPLIFY | 35 | 32 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/GmailDeliveryWorker.java` | SIMPLIFY | 13 | 10 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/GoogleAgentAccessFile.java` | KEEP | 38 | 38 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/GoogleWorkspaceReturn.java` | KEEP | 99 | 96 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/GoogleWorkspaceReturnFlow.java` | SIMPLIFY | 116 | 110 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedDelivery.java` | SIMPLIFY (owner decision on modes) | 73 | 50 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedDeliveryCancelled.java` | MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/HostedDelivery.java | 3 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedDeliveryWorker.java` | SIMPLIFY | 22 | 18 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedInbox.java` | SIMPLIFY | 43 | 40 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedNoticePoster.java` | SIMPLIFY | 60 | 45 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedResultNotices.java` | SIMPLIFY | 119 | 110 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedStorageFault.java` | MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/HostedInbox.java | 3 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/HostedTransport.java` | DELETE (owner decision P15) / else SIMPLIFY | 48 | 0 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/InvocationOwnerCache.java` | KEEP | 32 | 32 |
| `android/app/src/main/java/ai/alphacompute/alphaphone/IsolatedPdfService.java` | KEEP | 14 | 14 |

Totals: 3,027 physical lines now, about 2,490 after the proposed changes. Most of the cut comes from deleting the P-78 entries, the non-resident Hosted modes, the forwarding facades and the Notes/paired split in AlphaVoiceCloudPlugin. A formatter pass (D8) would make every file longer in physical lines. The estimates count today's dense style.

## Local types and helpers
| Name | Kind | File:line | Twins | Proposed home |
|---|---|---|---|---|
| `hash` (SHA-256 hex) | helper | HostedResultNotices.java:31 | CalendarSyncSnapshot.java:140 `digest`, GoogleWorkspaceReturnFlow.java:33-36, CalendarSyncBridge.java:64 (wrapper), AlphaDevicePlugin x4, WorkflowWorkerAssets.java:26, AlphaCredentialStore.java:159 | `util/Digests.sha256Hex` (lower-case hex, byte-identical) |
| slot store adapter | anon class | AlphaReminders.java:20-27, AlphaTelephony.java:27-33, AlphaNotificationsPlugin.java:41, HostedDelivery.java:15, GmailBackground.java:19-25 | NativeDeletionCoordinator, SourceRenewalHost, WorkflowNoticeTapsFactory, AlphaNoteAudioPlugin, AlphaCloudSignInPlugin, NativeOwnerReminderHost | `AlphaCredentialStore.asSlots()` (later: upstream `SecureSlots`) |
| `HostedInbox.Store` | interface | HostedInbox.java:8 | HostedResultNotices.Storage:14, NativeDigestSources.Storage, SourceRenewalNotices.Store, WorkflowNoticeDelivery.Storage | one `Slots` interface |
| `HostedInbox.Fence` / `HostedTransport.Guard` | interface | HostedInbox.java:11, HostedTransport.java:11 | NativeDigestSources.Guard, ResidentResultSession.Guard, ResidentCredentialShutdownRetry.Guard | one `Guard` functional interface |
| `id` / `sourceId` (`[A-Za-z0-9][A-Za-z0-9_-]{0,127}`) | helper | HostedInbox.java:16, HostedResultNotices.java:20 | HostedResultNotices.java:37,82 inline | `util/Ids.opaque128` |
| `[a-f0-9]{64}` / `[a-f0-9-]{36}` / UUID regexes | const | HostedResultNotices.java:29,37,80,90; HostedDelivery.java:45,57; CalendarSyncBridge.java:187; CalendarSyncSnapshot.java:34; GoogleWorkspaceReturn.java:26 | 17 copies of the 64-hex pattern repo-wide | `util/Ids` |
| `granted` (READ+WRITE calendar) | helper | CalendarSyncBridge.java:47,219; CalendarScopedDeletionReview.java:24 | NativeDigestHost.java:33,35, AlphaCalendarPlugin.java:111 | `CalendarPermissions.readWrite(Context)` |
| `foreground` / `reviewForeground` (owner surface) | helper | CalendarSyncBridge.java:48; CalendarScopedDeletionReview.java:25-26; ClockAgentReview.java:48-51 | AlphaDevicePlugin:30, AlphaLocalAgentPlugin:512, AlphaGmailPlugin:22, AlphaDeletionsPlugin:98, AlphaCalendarPlugin:112, AlphaHostedResultsPlugin:37, AlphaKeyboardDictationService:112 | `OwnerSurface.check(activity, options)` |
| `status(String)` JSObject | helper | CalendarSyncBridge.java:46; CalendarScopedDeletionReview.java:23 | ClockAgentReview.result:24 (different shape) | shared small util |
| whole-number JSON check | helper | ClockAgentReview.java:45-47; DailyAppsPlugin.java:81-86; CalendarAvailabilityJournalResult.java:21-26 | - | `util/Json.wholeNumber` |
| periodic + catch-up WorkManager scheduling | helper | GmailDeliveryWorker.java:10-11; HostedDeliveryWorker.java:11,16 | - | `util/Workers.schedulePair/cancelPair` |
| `renewalWork` / `renewalTag` (`"alpha-source-renewal-"+id`) | helper | HostedDeliveryWorker.java:12; HostedNoticePoster.java:44 | - | one helper in HostedResultNotices |
| `@Permission` library aliases | const | AlphaPhotosPlugin.java:16-21; AlphaPhotoLibraryPlugin.java:11-16 | - | string constants in AlphaMediaConfig |
| `"local-agent-provider:v1"` literal | const | AlphaVoiceCloudPlugin.java:52,249,254,338; CloudDeployment.java:26 (generated) | AlphaLocalAgentPlugin x4, KeyboardDictationCloud x2, LegacyCloudRecovery | `LocalAgentProviderAdmission.PROVIDER_SLOT` |
| `"cloud:production"` literal | const | CalendarSyncBridge.java:74,100,103,119; GmailBackground.java:25 | 32x in 9 files | `CloudSlots.PRODUCTION` |
| `"hosted-digests:v1:"` slot prefix | const | HostedInbox.java:26; HostedDelivery.java:67; HostedResultNotices.java:38 | - | HostedInbox constant |
| receipt phases `Set.of("deleted","undone","conflict")` | const | CalendarSyncBridge.java:149,199 | - | CalendarSyncReceiptRecovery constant |
| calendar email regex | const | CalendarSyncMutation.java:72; CalendarSyncSnapshot.java:88 | - | one constant |
| nonce regex `[A-Za-z0-9_-]{43}` | const | GoogleWorkspaceReturn.java:35; GoogleWorkspaceReturnFlow.java:112 | - | GoogleWorkspaceReturn |
| `delete2:` identity encoder | helper | CalendarDeletionIdentity.java:29; CalendarScopedDeletionReview.java:37 | - | CalendarDeletionIdentity |
| calendar deletion dispatch skeleton | helper | CalendarScopedDeletionReview.java:80-86; CalendarSyncBridge.java:218-225 | upstream CalendarPlugin.deleteReviewedExact | shared `CalendarDispatch` |
| `PasswordSurfaces` listener + `sensitiveSurfaceActive` | field/helper | AlphaVoiceCloudPlugin.java:42-44, 328-331 | - | shared speech helper / upstream base |
| Cloud voice credential read under authority | helper | AlphaVoiceCloudPlugin.java:49-54, 195-203, 335-342 | KeyboardDictationCloud (provider slot read) | `CloudVoiceCredential.read` |
| 429 body parser `limitOf/jsonText/limitData` | helper | AlphaVoiceCloudPlugin.java:161-187 | renderer `apps/app/src/runtime/cloud-voice-limit.ts` | `CloudVoiceLimit.fromResponse` |
| bounded stream read | helper | AlphaVoiceCloudPlugin.java:164; HostedTransport.java:30 | AlphaDevicePlugin:202, AlphaLocalAgentPlugin:595, KeyboardDictationCloud:92, WorkflowWorkerAssets:29, AlphaNoteRecorder:121 | `util/BoundedIo.read` |
| HttpURLConnection setup | helper | AlphaVoiceCloudPlugin.java:206-207, 280-281; HostedTransport.java:26 | AlphaConnectionPlugin:226,294, KeyboardDictationCloud:76, AlphaMapsTransportPlugin:52 | `util/Http` |
| `HostedDeliveryCancelled`, `HostedStorageFault` | exception classes | own files | - | nested in HostedDelivery / HostedInbox |
| `CalendarZones.sameZone` | helper | CalendarZones.java:10 | ClockAgentReview.zone (ICU canonical id; different rule) | private in AlphaCalendarPlugin |
| Renamable inner `Context` lease class | class | CalendarSyncBridge.java:32-38 | shadows android.content.Context | rename `Lease` |

## Delete candidates
| Item | Evidence | Confidence |
|---|---|---|
| `ConnectionRoutes.calendarSync` (ConnectionRoutes.java:26) | `git grep ConnectionRoutes.calendarSync`: 0 hits | high |
| `HostedTransport.Connections` + 4-arg constructor (HostedTransport.java:12,18-19) | only `new HostedTransport(store,binding,guard)` in HostedDelivery.java:17; no test injects it | high |
| `HostedNoticePoster.result(tap,redacted)` / `(tap,redacted,ask)` overloads (35-36) | Javadoc "Visible for builder tests"; caller only androidTest HostedResultNoticeInstrumentedTest:81 | high |
| `HostedResultNotices.capture(String)` 1-arg (75-77) | callers only test/fixtures/HostedNoticeWithdrawTest.java, HostedResultNoticesTest.java | high |
| Unused imports in HostedNoticePoster.java:10-12 (`com.getcapacitor.*`, `.annotation.*`, `java.util.concurrent.*`) | no symbol from them used | high |
| `CalendarCreationStore.java` (whole file) | facade; `create`/`acknowledge` only androidTest; `pendingCreations` one caller AlphaCalendarPlugin:97 | high |
| `AlphaPhotosPlugin.MEDIA_CONFIG` alias, `qaMarker` | alias of AlphaMediaConfig.MEDIA; qaMarker single internal caller (tests regex it) | high |
| `AlphaPhotosPlugin.preserveClosedVideoCopy` | only androidTest VideoCopyClosedFailureReviewInstrumentedTest:46 | medium (owner: is the reviewed recovery reachable in product?) |
| `CloudDeployment` constants `PRODUCTION_WEB`, `PRODUCTION_SERVICES`, `*_ENTITLEMENT_AUDIENCE`, `STAGING_WEB`, `STAGING_SERVICES` | 0 Java readers; generator scripts/cloud-deployment.ts:75 emits every row key | high (edit generator, not file) |
| `DailyAppsPlugin` `// MVP-DEFERRED:` comments (12, 32, 135-137) | commented-out code | high |
| `AlphaPowerVoiceActivity.java`, `AlphaQuickSettingsTile.java` (+ AlphaAssistActivity, PowerLaunchPin, `AlphaSystemPlugin.isAssistantLaunch`, DailyApps assistant hooks) | manifest `android:enabled="false"` (AndroidManifest.xml:94,129); nothing enables them; P-78 deferred | medium (owner decision P-78) |
| `HostedTransport.java` + `cloud`/`remote`/`local` modes in HostedDelivery.configure | PRD no hosted-agent pairing; Cloud never hosts Alpha's agent | medium (owner decision P15) |
| Paired speech in AlphaVoiceCloudPlugin (268-300 + `paired` branch) | throws unless ELIZA_DEV_ALLOW_TEST_MOCKS; PRD forbids pairing | medium (owner decision P15) |
| `AlphaVoiceCloudPlugin.instrumentationBaseUrl/instrumentationCredentialSlot` | test-APK hooks in main | medium (move to testMocks) |
| `AlphaTelephony` plaintext journal source `"alpha-sms-sends.journal"` | A1 migrate-from source; requires upstream SmsTelephonyConfiguration change | low (owner + upstream) |
| `CalendarZones.java` (merge) and `HostedDeliveryCancelled.java`, `HostedStorageFault.java` (nest) | single-method / two-line classes | high (mechanical) |

Not a delete candidate: `CalendarDeletionIdentity` numeric "legacy" form. The research listed it as A1. But `NativeDeletionCoordinator` still parses version-1 deletion targets through it, and those targets are dispatched by upstream `CalendarPlugin.deleteReviewedExact`. So the numeric id is the current single-event format. Rename it; do not delete it.

## Cross-file actions
1. **P-78 dormant entry removal**: AlphaPowerVoiceActivity.java, AlphaQuickSettingsTile.java, AlphaAssistActivity.java, AlphaLocalAgentPlugin.java (PowerLaunchPin, capturePowerLaunchPin, launchSurface, takeInvocation), AlphaSystemPlugin.java:48-49, DailyAppsPlugin.java:49-53,59,66-70, android/app/src/main/AndroidManifest.xml:91-97,129, android/app/src/launcher/AndroidManifest.xml:62-63, res strings `alpha_quick_settings_*`, scripts/apk.ts:89 + tile policy, android/aosp/branding/power-voice/*, android/aosp/branding/core-launcher (tile defaults, review only), scripts/owner/emulator-campaign-check.ts, apps/app/src/daily.ts:64,70, apps/app/src/main.tsx:227, apps/app/src/browser/daily.ts:72-73, tests test/apk-alpha-power-policy, apk-alpha-tile-policy, alpha-system-entry, power-sense-entry, launcher-orientation, voice-in-chat-only, specs/quint/native/manifest.json, specs/quint/refinement/native/AssistantEntryTraces.java, assistant-entry*.mjs, NavigationServiceTraces.java, test/support/feature-parity.mjs.
2. **Resident-only hosted delivery (P15)**: HostedDelivery.java (configure, openTransport), HostedTransport.java (delete), NativeDeviceEnrollmentKey.java (`cloud`), PairedAgentCredential.java, AlphaHostedResultsPlugin.java, renderer `apps/app/src/runtime/hosted-digest-ui.tsx`, `connection-ui.tsx` Cloud-runtime path, Quint NativeHostedInbox.qnt + hosted-inbox.mjs + HostedInboxTraces.java, test/resident-result-transport.test.mjs, test/native-plugin-teardown.test.mjs:113, scripts/android-instrumentation.ts, feature-parity allowlist.
3. **Paired speech removal (P15)**: AlphaVoiceCloudPlugin.java:268-323, PairedSpeechContract.java, PairedAgentCredential.java, apps/app/src/runtime/paired-voice.ts and its callers, androidTest Paired*, CloudSpeechPolicy.java:5 comment.
4. **AlphaVoiceCloudPlugin split**: move Notes recording methods to AlphaNoteAudioPlugin.java and change `apps/app/src/runtime/note-recorder-driver.ts` (plugin name) together; move `Streaming` to AlphaCloudSpeechStreamPlugin.java and update MainActivity.java registration; move 429 parsing into CloudVoiceLimit.java and update test/cloud-voice-limit.test.mjs; update the many host tests that slice AlphaVoiceCloudPlugin.java (notes-recorder, streaming-speech, cloud-voice-profile, plugin-worker-guard, native-plugin-teardown, live-voice, power-cold-native-pin) and Quint note-bridge refinements.
5. **Shared util package** (`ai.alphacompute.alphaphone.util`): Digests (HostedResultNotices.hash callers across ~18 files, CalendarSyncSnapshot, GoogleWorkspaceReturnFlow, CalendarSyncBridge), Ids, BoundedIo, Http, Json.wholeNumber, Workers (GmailDeliveryWorker + HostedDeliveryWorker), CalendarPermissions, OwnerSurface. Quint harnesses that compile these classes (`specs/quint/refinement/native/*.mjs` source lists) and javac host tests must add the util sources.
6. **Slot adapter consolidation**: add `AlphaCredentialStore.asSlots()`; update AlphaReminders, AlphaTelephony, AlphaNotificationsPlugin, HostedDelivery (+ HostedResultNotices.Storage -> HostedInbox.Store), GmailBackground, and the files outside this chunk listed in research P7.
7. **CloudDeployment trim**: edit scripts/cloud-deployment.ts:75 to emit only read fields, regenerate CloudDeployment.java and the TS twin, update test/cloud-deployment.test.mjs, test/white-label-copy.test.mjs.
8. **ConnectionRoutes facade removal**: AlphaConnectionPlugin.java (263-359) calls `ConnectionRoutes.POLICY` / `CloudConnectionPolicy` statics directly; update test/connection-routes.test.mjs + fixtures/ConnectionRoutesTest.java, androidTest ConnectionRoutesInstrumentedTest, test/login-surfaces, cloud-sign-in-flow, cloud-deployment tests.
9. **Small merges**: CalendarZones -> AlphaCalendarPlugin (+ test/calendar-availability-reader.test.mjs, fixtures/CalendarAvailabilityReaderTest.java, androidTest CalendarAvailabilityInstrumentedTest); HostedDeliveryCancelled -> HostedDelivery, HostedStorageFault -> HostedInbox (+ Quint hosted-inbox/deletion-coordinator/resident-coordinator harness source lists, test/fixtures/ResidentDeliveryTest.java, androidTest HostedBackgroundWorker); CalendarCreationStore delete (+ AlphaCalendarPlugin:97, two androidTests). Each merge must also edit the `test/support/feature-parity.mjs` allowlist path.
10. **LateLaunch / closedMessage boilerplate (P18)**: AlphaSystemPlugin:39-41, DailyAppsPlugin:55,57, AlphaVoiceCloudPlugin:74,101,344, AlphaPhotosPlugin:29, AlphaPhotoLibraryPlugin:19. Fix in the upstream base plugins (vendor/eliza PR + pin advance) or in one Alpha base class; test/native-plugin-teardown.test.mjs:272-332 asserts the current overrides.
11. **WorkManager class names are persisted**: renaming or merging `GmailDeliveryWorker`, `HostedDeliveryWorker` or `DeletionWorker` orphans enqueued work. Any split needs a cut-over that cancels the old unique work names.

## Text/path pins
- `test/support/feature-parity.mjs`: allowlists every one of the 49 paths. Each delete, merge or rename must edit it.
- `specs/quint/native/manifest.json`: pins 33 of these files. `specs/quint/services/manifest.json` pins the CalendarSync*, GmailBackground, GoogleAgentAccessFile and IsolatedPdfService files. `specs/quint/application/manifest.json` pins AlphaNotificationListener, AlphaNotificationsPlugin and AlphaSystemPlugin.
- Quint refinement harnesses compile the Java by path: `specs/quint/refinement/native/*.mjs` (hosted-inbox, hosted-result-notices, calendar-sync-enable, deletion-platform, scoped-calendar-review, note-bridge, note-recording-service, gmail-background, clock-review, sms/mms-dispatch, assistant-entry, update-barrier, resident-coordinator, credential-coordinator, source-renewal, native-digest-platform, keyboard-dictation-cloud, canonical-notification-tap, workflow-notice-*, app-info-handoff), plus `*Traces.java`, `specs/quint/refinement/services/*` and `specs/quint/native/NativeHostedInbox.qnt` / `NativeHostedResultNotices.qnt` / README.
- Host javac tests that compile these files: calendar-deletion-identity, calendar-sync-consent, calendar-sync-mutation, calendar-sync-receipt-recovery, calendar-availability-reader, cloud-voice-limit, cloud-voice-profile, connection-routes, gmail-background-lock-contention, google-workspace-return-*, workspace-return-fallback, invocation-owner-cache, native-google-agent-host-access, resident-result-transport, hosted-result-notices, hosted-notice-withdraw, native-digest-sources, native-notification-session, native-deletion-review-admission, native-calendar-sync-port, keyboard-dictation, legacy-cloud-recovery.
- Source-text regex/slice tests (T1/T2): test/photos-debug-diagnostics.test.mjs, test/context-selection.test.mjs:132, test/photo-library-permission-owner.test.mjs, test/native-plugin-teardown.test.mjs (counts executor/timer calls, override lists at 272-332), test/plugin-worker-guard.test.mjs:30,56-57, test/notes-recorder.test.mjs, test/clock-native-contract.test.mjs, test/canonical-notification-security.test.mjs, test/system-shade.test.mjs, test/aosp-image-capability.test.mjs, test/aosp-sms.test.mjs, test/reset-wiring.test.mjs, test/app-update.test.mjs, test/power-cold-native-pin.test.mjs, test/cloud-sign-in-flow.test.mjs:31.
- Scripts: scripts/apk.ts (component permission policy: AlphaPowerVoiceActivity, AlphaQuickSettingsTile, AlphaNotificationListener, AlphaSmsSendReceiver), scripts/cloud-deployment.ts (generates CloudDeployment.java), scripts/android-instrumentation.ts (ConnectionRoutes, HostedTransport), scripts/test-update-confirmation-platform.ts, scripts/test-android-notification-device-slot.ts, scripts/test-cross-app-notifications.ts, scripts/owner/emulator-campaign-check.ts, scripts/native-voice-latency.ts, scripts/android-cloud-voice-timing.ts.
- Build files: android/app/proguard-rules.pro (AlphaNotificationListener, HostedDeliveryWorker, IsolatedPdfService), both AndroidManifests, android/app/product.gradle (GoogleWorkspaceReturn.PATH), android/aosp/branding/{power-voice,core-launcher}.

## New patterns
- NEW-1, **persisted WorkManager worker class names**: WorkManager stores the worker's fully qualified class name in its database, so merging, renaming or nesting a `Worker` class (GmailDeliveryWorker, HostedDeliveryWorker, DeletionWorker) orphans already-enqueued work. This is installed identity of the same kind as manifest component names. Treatment: keep the class names, or ship a cut-over that cancels the old unique work names.
- NEW-2, **misattributed shared helper**: a generic utility lives on an unrelated feature class and is imported from there by ~18 files (`HostedResultNotices.hash` used for Calendar sync revisions, credential digests and device enrollment). The nearest catalogue entry is C3, but here the cost is a false dependency on the Hosted notices class. Treatment: move it to a util and update the callers.
- NEW-3, **inner class shadowing an Android framework type** (`CalendarSyncBridge.Context`): it forces fully qualified `android.content.Context` elsewhere in the file. A sub-case of D11.

## Owner questions
1. P-78: delete AlphaPowerVoiceActivity, AlphaQuickSettingsTile, AlphaAssistActivity and their AOSP patches and tests now, and restore them from git when wake listening lands?
2. P15: is hosted-result delivery resident-only? If yes, delete HostedTransport and the `cloud`/`remote`/`local` modes in HostedDelivery.configure, plus paired speech in AlphaVoiceCloudPlugin. Do any pilot devices hold a `hosted-background:v1:active` record with a non-resident mode?
3. Did any `ai.alphacompute.alphaphone` install ever write the plaintext SMS journal `alpha-sms-sends.journal`? If not, drop the migration source upstream in SmsTelephonyConfiguration.
4. Does the shared Calendar review still produce version-1 deletion targets with plain numeric ids? If yes, CalendarDeletionIdentity's "legacy" form is current and should only be renamed.
5. Is `AlphaPhotosPlugin.preserveClosedVideoCopy` (reviewed recovery for a closed video copy) reachable in the product? If not, delete it with VideoCopyClosedFailureReviewInstrumentedTest.
6. Should the `DailyApps.perform('browser')` fallback to `https://example.com` when no URL is given stay, or should a missing URL be refused?
7. Should the test-APK hooks (`instrumentationBaseUrl`, `instrumentationCredentialSlot`, `IsolatedPdfService.stallFixture`) move to the testMocks source set, or is gating on `ELIZA_DEV_ALLOW_TEST_MOCKS` in main enough?
8. Should the LateLaunch and closedMessage boilerplate be fixed upstream in vendor/eliza base plugins (which needs a pin advance) or in a local Alpha base class?
