# Chunk android-13 — summary

17 files in `android/app/src/main/java/ai/alphacompute/alphaphone/` (3,349 physical lines). Per-file reports are in
`docs/simplification-audit/files/android/app/src/main/java/ai/alphacompute/alphaphone/<File>.java.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| AlphaFilesPlugin.java | SIMPLIFY | 234 | 215 |
| AlphaGmailPlugin.java | SIMPLIFY | 40 | 30 |
| AlphaHostedResultsPlugin.java | SIMPLIFY (owner: SPLIT workflow notices / P15) | 114 | 100 |
| AlphaImageCapabilities.java | MERGE into AlphaImageCapability.java | 20 | 0 |
| AlphaImageCapability.java | SIMPLIFY (absorbs the twin) | 26 | 25 |
| AlphaKeyboardDictationService.java | SIMPLIFY (small) | 204 | 195 |
| AlphaListenerPlugin.java | DELETE | 8 | 0 |
| AlphaLocalAgentPlugin.java | SPLIT + SIMPLIFY | 1371 | ~1180 (across 6-7 files) |
| AlphaMailAttachmentsPlugin.java | SIMPLIFY | 191 | 170 |
| AlphaMailFileProvider.java | KEEP | 15 | 15 |
| AlphaMailPdfActivity.java | KEEP | 21 | 21 |
| AlphaMapsTransportPlugin.java | SPLIT (dev transport to testMocks) | 109 | 45 (+~60 in testMocks) |
| AlphaMediaConfig.java | SIMPLIFY (A1, owner) | 21 | 17 |
| AlphaNavigationService.java | SIMPLIFY (small) | 276 | 258 |
| AlphaNoteAudioPlugin.java | SPLIT + SIMPLIFY | 284 | 95 (+~150 NotesTrashBackstop) |
| AlphaNoteDocumentsPlugin.java | SIMPLIFY (small) | 69 | 62 |
| AlphaNoteRecorder.java | SIMPLIFY | 346 | 325 |
| **Total** | | **3,349** | **~3,000** (≈ −350 incl. moves out of main) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `foreground()` / `sourceForeground()` / `filesReviewVisible()` / `requireProviderOwner()` / `allowedNow()` | helper | AlphaGmailPlugin:22, AlphaHostedResultsPlugin:35-39, AlphaFilesPlugin:127, AlphaLocalAgentPlugin:512-520, AlphaKeyboardDictationService:106-114 (+ inline AlphaMailAttachmentsPlugin:68,114,167; AlphaNoteDocumentsPlugin:28 via AlphaDevicePlugin.shareForeground) | AlphaDevicePlugin.shareForeground, AlphaDeletionsPlugin:98, CalendarSyncBridge:48, ClockAgentReview:50 | `OwnerSurface.check(activity, requireFocus)` (IME keeps its own) |
| `Work` / `StorageWork` / `ProviderChange` | interface | AlphaGmailPlugin:17, AlphaFilesPlugin:36, AlphaLocalAgentPlugin:525 | AlphaDeletionsPlugin.Task, HostedDelivery.NativeSourceWork | base-plugin `background(call, Callable<JSObject>, refused)` |
| `submit` / `work` / `storage` / `run` wrappers | helper | AlphaGmailPlugin:18-21, AlphaHostedResultsPlugin:23-25, AlphaMailAttachmentsPlugin:47-49, AlphaFilesPlugin:38-51, AlphaNoteDocumentsPlugin:52 | each other, AlphaDevicePlugin.diagnostics | same base helper |
| main-thread latch | helper | AlphaFilesPlugin:201-205, AlphaHostedResultsPlugin:35-39 | each other | `MainThread.await(activity, Callable, timeout)` |
| `result(status,message)` / `saveResult` | helper | AlphaNoteDocumentsPlugin:21, AlphaMailAttachmentsPlugin:159 | upstream `DocumentFolderTree.result` (used by AlphaFilesPlugin:30) | `DocumentFolderTree.result` |
| DISPLAY_NAME query | inline helper | AlphaMailAttachmentsPlugin:61,141, AlphaNoteDocumentsPlugin:56 | DailyAppsPlugin | `SelectedDocumentAccess.displayName` |
| bounded stream read | helper | AlphaNoteRecorder:120-128, AlphaLocalAgentPlugin:595-608, AlphaMapsTransportPlugin:58-59 | AlphaDevicePlugin:202-205, AlphaVoiceCloudPlugin:164, KeyboardDictationCloud:92, HostedTransport:30, WorkflowWorkerAssets:29 | `BoundedIo.read(in, limit)` |
| UUID regex | const | AlphaNoteRecorder:55 (`ID`), AlphaNoteAudioPlugin:71 (`OPERATION`, byte-identical), AlphaLocalAgentPlugin:762,769,878,910,1127,1297 | GoogleWorkspaceReturn:26, NativeNotificationSession:51, PairedAgentCredential:23, HostedDelivery:45 | `Ids` util |
| `[a-f0-9]{64}` check | helper | AlphaNoteRecorder:132, AlphaLocalAgentPlugin:425,1063,1077 | 17× repo-wide | `Ids.isSha256Hex` |
| `ResidentAttachDiagnostic` | class | AlphaLocalAgentPlugin:22-39 | NativeNotificationDiagnostics:7,12,23 | `Diagnostics` util |
| anonymous slot adapters | helper | AlphaNoteAudioPlugin:39-44, AlphaLocalAgentPlugin:302-321,459-477 | AlphaReminders, AlphaTelephony, HostedDelivery, GmailBackground, … (P7) | `AlphaCredentialStore.asSlots()` / upstream `SecureSlots` |
| `"local-agent-provider:v1"` / `"cloud:production"` | const | AlphaLocalAgentPlugin:190,191,313,316,358,460,461,474,502,547,644,646,658 | AlphaVoiceCloudPlugin, KeyboardDictationCloud, AlphaCredentialStore, LegacyCloudRecovery, CloudDeployment | `LocalAgentProviderAdmission.PROVIDER_SLOT` + `Slots.CLOUD` |
| `IMAGE`, `aospImage`, `roleEnabled`, `defaultAppEnabled` | const/helper | AlphaImageCapabilities:13-19 | AlphaImageCapability.verified | `AlphaImageCapability` |
| `featureName` | helper | AlphaImageCapability:22 | upstream `ImageCapability.featureName` | delete |
| `hash/validate/validateOpaque/opaqueMime/read`, `MAX_BYTES` | helper/const | AlphaMailAttachmentsPlugin:33,54-60 | upstream `DocumentBytes` | delete |
| `"mail-attachments"` | const | AlphaMailFileProvider:9,11, AlphaMailAttachmentsPlugin:51,53 | each other | `AlphaMailAttachmentsPlugin.FOLDER` |
| `text(call,name)` | helper | AlphaMapsTransportPlugin:69 | AlphaNavigationService.bounded:173 | delete (service bounds) |
| `CHANNEL/ACTION/PREFIX/ASK_ACTION` | const | AlphaHostedResultsPlugin:18-19 | consumed by HostedNoticePoster:17,20,30 | `HostedNoticePoster` |
| `NotesTrashBackstopWorker` | class | AlphaNoteAudioPlugin:78-87 | GmailDeliveryWorker, HostedDeliveryWorker scheduling | `NotesTrashBackstop` (keep binary name) |
| MediaRecorder stop+release | helper | AlphaNoteRecorder:202-203,213,254 | none outside | `stopAndRelease` in file |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `AlphaListenerPlugin.java` + `MainActivity.java:355` | `AlphaListener` has 0 hits in apps/ and .eliza/client-features; renderer uses `Sense`; same SensePlugin already registered at `MainActivity.java:356`. Pins: test/always-on-listener.test.mjs:29-45, feature-parity.mjs:66, quint native manifest:219,260 | high |
| `AlphaLocalAgentPlugin`: `applyProviderEnvironment` (482), `PROVIDER_MODEL_PATTERN` (483), `CLOUD_PROVIDER_BASE` (433), `cloudProviderToken` (481), `providerCheckFailure` (300), 4-arg `saveVerifiedProvider` (323), `providerIdentity` (496-499), `applyUnboundEnvironment` (484-495) | whole-repo grep: 0 production callers for each; callers are androidTest `LocalAgentProviderInstrumentedTest` and source-slicing host tests | high |
| `AlphaLocalAgentPlugin.validProviderToken` forward (480) | 1 external caller (AlphaConnectionPlugin:225) → switch to `LocalAgentProviderAdmission` | high |
| `AlphaLocalAgentPlugin.launchSurface`, `takeInvocation` (330-348) | renderer never calls `Agent.launchSurface/takeInvocation` (apps/ + .eliza: only `Sense.takeInvocation`); callers AssistantInstrumentedTest + Quint AssistantEntryTraces | medium (owner P-78) |
| `AlphaLocalAgentPlugin.PowerLaunchPin` / `capturePowerLaunchPin` (101-118) | sole caller `AlphaPowerVoiceActivity` is `android:enabled="false"` with no enabler | medium (owner P-78) |
| `AlphaLocalAgentPlugin` test hooks (44-45, 151-160, 680-689) | only androidTest + Quint `CredentialResidentTraces` | high to move out of main; delete depends on test strategy |
| `AlphaGmailPlugin.notificationSettings` (31) | upstream wrapper exposes it, but Alpha `gmail-background.ts` never re-exports/calls it (0 callers in apps/) | medium |
| `AlphaNoteAudioPlugin` migration (`migrateLegacyMetadata`, `migrationState`, `migrationFailures`, `migrationStatus`) | P5: package renamed 2026-11-10; renderer `voice-adapter.ts` does not declare `migrationStatus` (only browser shim) | medium (owner P5) |
| `AlphaFilesPlugin.PREF` + `load()` + `releaseRetiredTree` | `alpha-files-tree` has no writer anywhere | high (owner P5 confirms) |
| `AlphaMediaConfig .legacyCaptures("Pictures/")` + `KeptCaptureLegacyPathInstrumentedTest` + `test/owned-captures-legacy-path.test.mjs` | P5 legacy reader | medium (owner P5) |
| `AlphaMailAttachmentsPlugin.MAX_BYTES` | 0 readers | high |
| `AlphaMailAttachmentsPlugin` forwards `validateOpaque`, `opaqueMime`, `read`, `hash`, `validate` | upstream `DocumentBytes`; only androidTest/regex pin `validate`/`hash` | high |
| `AlphaImageCapability.featureName` | pass-through to upstream; 1 main caller | high |
| `AlphaImageCapabilities.java` (merge) | twin of `AlphaImageCapability` | high |
| `AlphaNavigationService` `stopCount/lastStopReason/lastTitle/lastText/snapshot()` | read only by androidTest + Quint trace | medium |
| `AlphaNavigationService` pre-Q branches (77, 202-203) | minSdk 29 = Q (`AndroidManifest.xml:35`) | high |
| `AlphaMapsTransportPlugin` dev transport (21-67) out of main | refuses unless `ELIZA_DEV_ALLOW_TEST_MOCKS`; renderer gateway test-mocks only | high (move, not delete) |
| `AlphaMapsTransportPlugin.text()` | `AlphaNavigationService.bounded` already bounds | high |
| unused imports: AlphaHostedResultsPlugin `Uri`, `PackageManager`; AlphaMailAttachmentsPlugin `java.nio.*`, `java.nio.charset.*`, `java.security.*` | appear only in import lines | high |

## Cross-file actions
1. **Image capability merge**: delete `AlphaImageCapabilities.java`; edit `AlphaImageCapability.java`, `AlphaContactsPlugin.java:15`, `AlphaDeviceAppsPlugin.java:16-17`, `AlphaSystemPlugin.java:42,45`, `AlphaTelephony.java:25` (use `ImageCapability.featureName`), manifest comments `src/main/AndroidManifest.xml:29`, `src/launcher/AndroidManifest.xml:5`; tests `test/aosp-capabilities.test.mjs`, `test/aosp-image-capability.test.mjs:83-86,133`, `test/native-plugin-teardown.test.mjs:366`, `test/support/feature-parity.mjs:63-64`, androidTest `ImageCapabilitiesInstrumentedTest`; specs `specs/quint/native/manifest.json:493,2519,2581`, `specs/quint/refinement/native/app-info-handoff-platform.mjs:52-53` (stub class).
2. **AlphaListener removal**: `AlphaListenerPlugin.java`, `MainActivity.java:355`, `test/always-on-listener.test.mjs:29-45`, `test/support/feature-parity.mjs:66`, `specs/quint/native/manifest.json:219,260`.
3. **Provider forwards removal** in `AlphaLocalAgentPlugin`: also `AlphaConnectionPlugin.java:225`, androidTest `LocalAgentProviderInstrumentedTest:35-76`, `test/legacy-cloud-recovery.test.mjs:44`, `test/product-character-host.test.mjs:38-39`, `test/local-agent-provider-admission.test.mjs:19`, `test/native-embedding-profile.test.mjs:19`, `test/fixtures/legacy-cloud-recovery/{ProviderCancellationTest,ProviderOwnKeysTest,StoreIntegrationTest}.java` (3-arg `bindCloudProvider`), `specs/quint/native/README.md:23`.
4. **P-78 dormant assistant/power**: `AlphaLocalAgentPlugin.java:101-118,330-348`, `AlphaAssistActivity.java` (`takeInvocation`), `AlphaPowerVoiceActivity.java`, androidTest `AssistantInstrumentedTest`, `test/power-cold-native-pin.test.mjs`, `test/power-sense-entry.test.mjs`, specs `assistant-entry-platform.mjs:166`, `AssistantEntryTraces.java:229-230`, `resident-platform.mjs:207`.
5. **Test hooks out of main**: `AlphaLocalAgentPlugin.java:44-45,151-160,680-689` → testMocks source set (`android/consumer-host.json` `testMocks.debug.java`); androidTest `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`, `ResidentWorkflowCrashInstrumentedTest`; Quint `CredentialResidentTraces.java`. Same for `AlphaNavigationService.snapshot()` (+ `MapsBackgroundNavigationInstrumentedTest`, `NavigationServiceTraces.java`).
6. **Maps dev transport split**: `AlphaMapsTransportPlugin.java`, new testMocks plugin, `MainActivity.java:333` (register dev subclass under test mocks), `apps/app/src/maps/regional-provider.ts:33` (name unchanged if subclassed), `test/plugin-worker-guard.test.mjs:28`, `specs/quint/refinement/native/navigation-service.mjs:19`, `NavigationServiceTraces.java:17,26`, androidTest `MapsBackgroundNavigationInstrumentedTest:101`.
7. **Notes Trash backstop extraction**: `AlphaNoteAudioPlugin.java` → new `NotesTrashBackstop.java`; `AlphaApplication.java:26`; androidTest `NotesTrashBackstopInstrumentedTest`; `test/notes-deletion-lease.test.mjs:16`, `test/notes-recorder.test.mjs:325,519`, `test/reset-startup.test.mjs:48` (stub), `test/plugin-worker-guard.test.mjs:29` (`migrationWorker` rename). WorkManager class name must stay or the periodic work re-enqueued with `UPDATE`.
8. **Shared utils** (`OwnerSurface`, `MainThread`, `BoundedIo`, `Ids`, `Diagnostics`, base-plugin `background`): every file in this chunk except MailFileProvider/MailPdfActivity/MediaConfig/Navigation, plus AlphaDevicePlugin, AlphaDeletionsPlugin, CalendarSyncBridge, ClockAgentReview, NativeNotificationDiagnostics, KeyboardDictationCloud, HostedTransport, WorkflowWorkerAssets, AlphaVoiceCloudPlugin.
9. **Slot constants (P6)**: `AlphaLocalAgentPlugin` literals + `AlphaVoiceCloudPlugin`, `KeyboardDictationCloud`, `AlphaCredentialStore`, `LegacyCloudRecovery`, `CloudDeployment`, `RendererCredentialSlots`.
10. **`"mail-attachments"` constant**: `AlphaMailFileProvider.java`, `AlphaMailAttachmentsPlugin.java` (+ `res/xml/mail_attachment_paths.xml` keeps its literal).
11. **Hosted notice constants move**: `AlphaHostedResultsPlugin.java:18-19` → `HostedNoticePoster.java`; `AlphaNotificationsPlugin.java:56`; `test/context-selection.test.mjs:231`; `HostedResultNoticeTraces.java:281-282`; androidTest `HostedResultNoticeInstrumentedTest:81-82`.
12. **`AlphaLocalAgentPlugin` split (P2)**: with `AlphaCredentialStore` (cycle), the 17 static-caller files, `test/fixtures/app-update-jvm/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java` stub, 61 host tests, 42 specs files.

## Text/path pins
- `test/support/feature-parity.mjs` lists all 17 files.
- `specs/quint/native/manifest.json`: AlphaListenerPlugin(219,260), AlphaImageCapabilities(493), AlphaImageCapability(2519,2581), AlphaHostedResultsPlugin(2317,2808), AlphaMailAttachmentsPlugin(1886), AlphaGmailPlugin(3006), AlphaKeyboardDictationService, AlphaMailFileProvider, AlphaMapsTransportPlugin, AlphaNavigationService, AlphaNoteRecorder, AlphaLocalAgentPlugin. `specs/quint/application/manifest.json`: AlphaFilesPlugin(960), AlphaMailAttachmentsPlugin(533). `specs/quint/services/manifest.json`: AlphaMapsTransportPlugin, AlphaNavigationService, AlphaLocalAgentPlugin.
- Source-slicing/regex tests: `test/always-on-listener.test.mjs:29-45`; `test/gmail-background-binding.test.mjs:18-46`; `test/gmail-lifecycle-custody.test.mjs:4`; `test/files-browser.test.mjs:245-379`; `test/files-legacy-storage.test.mjs:11`; `test/files-storage-refusal.test.mjs:10`; `test/native-deletion-admission.test.mjs:77` (HostedResults method markers); `test/context-selection.test.mjs:231`; `test/aosp-capabilities.test.mjs:25-39`; `test/aosp-image-capability.test.mjs:83-86,133`; `test/keyboard-dictation.test.mjs:14-15,64`; `test/note-source-references.test.mjs:28-35`; `test/notes-recorder.test.mjs:312-607`; `test/notes-deletion-lease.test.mjs:16`; `test/legacy-cloud-recovery.test.mjs:44`; `test/product-character-host.test.mjs:38-39`; `test/local-agent-provider-admission.test.mjs:19`; `test/native-embedding-profile.test.mjs:19`; `test/resident-attachment.test.mjs:52`; `test/power-cold-native-pin.test.mjs:47-131`; `test/plugin-worker-guard.test.mjs:23-30` (worker field names; `AlphaFilesPlugin:['worker',…]` is already stale — no `worker` field exists); `test/native-plugin-teardown.test.mjs:272,283,366`; `test/owned-captures-legacy-path.test.mjs` (re-declares the AlphaMediaConfig builder).
- Quint harnesses that compile/cut these sources: `specs/quint/refinement/native/{gmail-background*.mjs, GmailBackgroundTraces.java (reflects on field io), hosted-result-notices.mjs, source-renewal-platform.mjs, native-digest.mjs, HostedResultNoticeTraces.java, SourceRenewalTraces.java, navigation-service.mjs, NavigationServiceTraces.java, NavigationServicePorts.java, reviewed-copies.mjs, ReviewedCopiesTraces.java, note-*.mjs, Note*Traces.java, main-activity-platform.mjs, resident-platform.mjs, sms-dispatch.mjs, mms-dispatch.mjs, app-info-handoff-platform.mjs, assistant-entry-platform.mjs:166, AssistantEntryTraces.java, CredentialResidentTraces.java and ~30 more for AlphaLocalAgentPlugin}`, `specs/quint/native/NativeNoteRecording.qnt`, `ResidentStartCancel.qnt`.
- Scripts: `scripts/apk.ts:92,171-177` (AlphaKeyboardDictationService permission audit), `scripts/aosp-image-capability.ts:6` and `apps/app/src/runtime/aosp-image.ts:7` (comments cite `AlphaImageCapability.java`), `scripts/test-android-notification-device-slot.ts` (AlphaLocalAgentPlugin), `test/aosp-fresh-presets.test.py:93`, `test/apk-keyboard-dictation.test.mjs:13`.
- AlphaLocalAgentPlugin host tests (61): agent-always-local, alpha-system-entry, always-on-listener, android-host, browser/helpers/resident-agent-plugin.ts, canonical-notification-security, cloud-prewarm, cloud-sign-in-flow, cloud-voice-profile, connection-routes, credential-owner-admission, credential-slot-lock-order, credential-stop-dispatch, digest-missed-run-now, fixtures/{GmailBackgroundLockContentionTest, GoogleAgentAccessFileTest, UpdateFlowTest, app-update-jvm stub, legacy-cloud-recovery/*}, gmail-background-binding, gmail-background-lock-contention, invocation-owner-cache, keyboard-dictation, legacy-cloud-recovery, live-asr-route-token, live-voice, local-agent-provider-admission, native-credential-read, native-deletion-review-fence, native-embedding-profile, native-google-agent-host(-access), native-navigation-client-header, native-notification-device-slot, native-plugin-teardown, native-request-cancel, native-resident-request-deadline, native-runtime-identity-boot, native-stream-admission, native-voice-event-worker, notification-installation-root, notification-persist-owner-branches, one-runtime-profile, owner-route-parity, plugin-worker-guard, power-cold-native-pin, power-sense-entry, prepared-navigation-route, product-character-host, quint-resident-start-cancel, reset-startup, resident-attachment, resident-credential-shutdown-retry, resident-native-patch-admission, resident-recovery-review, resident-result-transport, resident-start-failure-policy, support/feature-parity, upstream-owner-gate-compat, voice-turn-routes.

## New patterns
- **NEW-1 Copy-pasted reject copy across sibling methods**: `AlphaLocalAgentPlugin.subscribeViewEvents` rejects with `"Invalid voice subscription."` (copied from the voice variant). Duplicated method skeletons carry wrong nouns; merging them (C5) fixes it.
- **NEW-2 Pin lists that drift from code**: `test/plugin-worker-guard.test.mjs:23` still names an `AlphaFilesPlugin.worker` field that no longer exists; the regex test passes vacuously for it. Pin tables in tests rot silently (supports T1).
- **NEW-3 Persisted class names**: WorkManager stores the worker's binary class name (`AlphaNoteAudioPlugin$NotesTrashBackstopWorker`); moving nested workers is a persisted-format change, like storage keys. Treat worker class names as installed identities when splitting files.
- **NEW-4 Dead API-level branches**: `Build.VERSION.SDK_INT < Q` checks with minSdk 29 (`AlphaNavigationService:77,202-203`). A B4 variant worth a repo-wide grep.

## Owner questions
1. P5: may every new-package legacy reader in this chunk go now (`AlphaFilesPlugin` retired SAF tree, `AlphaNoteAudioPlugin` metadata migration + `migrationStatus`, `AlphaMediaConfig.legacyCaptures("Pictures/")`)?
2. P-78: delete `Agent.launchSurface`/`Agent.takeInvocation` and `PowerLaunchPin` with the disabled assistant/power activities, or keep them dormant?
3. Image capability: should Telecom/SMS roles be requestable on the verified image (`AlphaImageCapabilities.roleEnabled` says no; launcher `AlphaTelephonyRoles` enables the components)?
4. Is `AlphaGmailPlugin.notificationSettings` wanted as a Settings entry, or delete it?
5. `AlphaHostedResultsPlugin`: split Workflow approval notices into their own plugin (renderer name change), and which `HostedDelivery` modes survive P15?
6. Are `cancelBackground`/`disableBackground`/`setBackgroundPolling` deliberately off the `io` worker (common ForkJoin pool)?
7. Test strategy: may the resident `*ForTest` hooks and `instrumentationRecoveryEndpoint` move to the testMocks source set (requires gating those instrumentation suites to test-mocks builds)?
8. Should a missing `agent/workflow-worker/files.sha256` be a launch error (comment says "Older payloads do not contain a workflow worker")?
9. Files review uses only `hasWindowFocus` (no keyguard check) while other owner actions require unlocked; intentional?
10. Fix the `"Invalid voice subscription."` reject copy on the view subscription?
