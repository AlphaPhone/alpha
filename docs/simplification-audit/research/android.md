# Android area audit (`android/`)

Scope: `android/app` (main, launcher, standalone, testMocks, androidTest), `android/aosp`, `android/signing`,
`android/sense`, `android/sense-speech`, `android/local-speech`, `android/video-fixture`,
`android/notification-fixture`, `android/private-peer-fixture`, `android/embedding-host`, `android/voice-host`,
`android/paradee-voice`, `android/gradle`. Read-only research. All paths are relative to the worktree root.

Method notes and limits:
- `vendor/eliza` and `.eliza/` are **empty in this worktree**, so upstream base classes (e.g. `SensePlugin`,
  `NativeProviderSlot`, the generated `ElizaAgentService`) and the shared renderer client code under
  `.eliza/client-features` could not be read. Every "unused" claim below was checked with whole-repo greps over
  `apps/ android/ scripts/ test/ specs/ .github/ package.json`; where a caller could live only in `.eliza`, the
  finding is marked **suspicion**.
- Main Java was read end to end for the large plugins (in chunks) and every file of 35 lines or fewer was read in
  full; the rest were skimmed by structure greps.

---

## 1. Area overview

Size (non-generated): `app/src/main` 150 files / ~12.0k physical lines (131 Java classes, 11.6k lines, but 562 lines
exceed 200 characters and 95 exceed 400, the longest 1,273 characters, so logical size is far larger);
`app/src/androidTest` 236 files / ~23.9k lines (187 test classes, twice the size of the product code);
`aosp` 89 files / 4.6k lines (patches, Python preparers and their tests, overlays); `gradle/verification-metadata.xml`
4.6k lines; small fixture and host modules.

How it fits together:
- **There is no checked-in Gradle project.** `android/consumer-host.json` is fed to the upstream generator
  (`vendor/eliza/packages/app/scripts/mobile/android/consumer-host.mjs`, run by `scripts/android-host.ts`) which writes the
  ignored build files. It declares the two product flavors (`standalone`, `launcher`, differing only in
  `BuildConfig.IS_LAUNCHER` and a manifest overlay), ~25 modules (mostly upstream `plugin-native-*` Android libraries,
  several "patchedNative"), dependencies, test-mocks source sets and the "residentHost" (the generated
  `ElizaAgentService` and notification classes that the product Java calls but which do not exist in the repo).
  `android/app/product.gradle` adds Alpha-only Gradle checks (App Links host, update-manifest URL, private QA update
  channel, voice/embedding host verification `Exec` tasks).
- **App = Capacitor WebView + ~29 registered plugins** (`MainActivity.java:328-366`). Almost every product plugin is a
  thin subclass of an upstream plugin that only supplies "installed identity" constants (plugin name, slot names,
  channel IDs, actions). Only a handful hold real product logic: `AlphaLocalAgentPlugin` ("Agent", 1,371 lines: resident
  lifecycle, credential fences, provider settings, request gate, notification session), `AlphaDevicePlugin` (857 lines:
  device facts, share, text scale, crash log, diagnostics **and** the whole self-updater), `AlphaConnectionPlugin`,
  `AlphaVoiceCloudPlugin`, `AlphaCloudSignInPlugin`, `AlphaNoteAudioPlugin`, Calendar sync, Hosted results.
- **Process-wide services live as static state inside plugin classes.** `AlphaLocalAgentPlugin` holds the resident's
  lifecycle epoch, tokens and the credential lifecycle lock as statics; `AlphaCredentialStore`, voice, keyboard, Gmail,
  update, reminders, notifications, receivers and the `Application` call into it statically (16 files). Small
  "Host"/"Factory" singletons (`SourceRenewalHost`, `WorkflowNoticeTapsFactory`, `NativeDigestHost`, `GmailBackground`,
  `HostedDelivery`, `NativeDeletionCoordinator`, `AlphaActionJournal`) compose upstream engines with adapters onto the
  single encrypted slot store `AlphaCredentialStore` (`JsonCredentialSlots`).
- **Flavor and AOSP gating.** Standalone removes every telephony/contacts/SMS permission
  (`app/src/standalone/AndroidManifest.xml`) and has an empty `AlphaTelephonyRoles.sync`. Launcher adds HOME, keyboard
  dictation IME and **disabled** dialer/SMS role components that `AlphaTelephonyRoles.sync` enables only when
  `AlphaImageCapability.verified` (system-partition release launcher + overlay resource `alpha_aosp_image_capability` +
  image system feature). A second, weaker gate `AlphaImageCapabilities.aospImage` (resource + system flag only) drives
  Contacts and the dial hand-off. `AlphaTelephonyPlugin` is registered only on the verified image.
- **Dormant entries.** `AlphaAssistActivity`, `AlphaPowerVoiceActivity` and `AlphaQuickSettingsTile` are declared
  `android:enabled="false"` and nothing enables them (P-78; `scripts/stage-aosp.ts:201-205`); the Sense listener APK
  (`android/sense`) is development-only.
- **Host tests and formal models compile product Java directly.** 113 `test/` files reference
  `android/app/src/main/java`; 46 javac-compile individual product classes against hand-written Android stubs and 51
  slice or regex the Java source text. `specs/quint/native/manifest.json` pins 86 of the 131 main classes. This
  shapes the product code heavily (see pattern P1).
- **AOSP (`android/aosp`)** is a source packet for the OS image: JSON product locks, framework/SystemUI/Settings
  patches, three product Java policies, overlays, Python `prepare.py`/`apply.py` and Python tests.

---

## 2. Pattern taxonomy

### P1. Test-seam shaping ("host-javac architecture")
**Looks like:** product classes split into tiny Android-free classes "so javac can test them", delegate methods kept
"for callers" that are only tests, functional interfaces with one production implementation, and Javadoc that says
`No Android types: host-tested by javac.`
**Why it hurts:** dozens of 6-40 line classes, extra indirection, and dead production methods that cannot be removed
because a source-text test or a Quint manifest names them.
**Examples:**
- `PluginWorkers.java:11` "No Capacitor types: host-tested by javac." (a 3-line try/catch).
- `NotesDeletionLease.java:10`, `RendererRecoveryBudget.java:16-17` same comment.
- `AlphaLocalAgentPlugin.java:479` "The provider rules live in LocalAgentProviderAdmission (host-JVM tested); these names
  stay for callers." followed by pass-throughs `validProviderToken`, `cloudProviderToken`, `applyProviderEnvironment`,
  `PROVIDER_MODEL_PATTERN` (480-483). `applyProviderEnvironment`, `PROVIDER_MODEL_PATTERN`, `CLOUD_PROVIDER_BASE` (433),
  `providerCheckFailure` (300), the 4-arg `saveVerifiedProvider` (323) and `providerIdentity` (496) have **no production
  caller**; only `androidTest/LocalAgentProviderInstrumentedTest.java` and source-slicing host tests
  (`test/legacy-cloud-recovery.test.mjs:44` slices `' static JSObject providerIdentity('`;
  `test/product-character-host.test.mjs:38` slices `' static void applyUnboundEnvironment('`).
- `ResidentCredentialShutdownRetry.java:5-8` four interfaces (`Guard`, `Probe`, `Clock`, `Pause`) for one call site
  (`AlphaLocalAgentPlugin.java:714-718`).
- `NativeReadEpoch.java` exists only for `test/native-read-epoch.test.mjs` and Quint traces (see delete candidates).
- `test/aosp-capabilities.test.mjs:10-40` re-implements `Context`, `PackageManager`, `Resources` stubs to compile
  `AlphaImageCapabilities.java` + `AlphaImageCapability.java`.
**Widespread:** ~40 of 131 main classes are compiled by host tests; 86 are pinned by `specs/quint/native/manifest.json`.
**Treatment:** decide test strategy first (owner wants e2e/integration only). Then inline the micro-classes into their
single caller and delete the pass-through delegates. Requires deleting/rewriting the javac and source-slice tests and
updating the Quint refinement manifests in the same change.
**Risk:** high churn in `test/` and `specs/quint/refinement/native/*.java`; the Quint CI lane will fail until the
manifests are updated.

### P2. Plugin-as-service-locator / static god state
**Looks like:** process-wide mutable state and locks declared `static` inside a Capacitor `Plugin` subclass and called
from the `Application`, receivers, workers, services and other plugins.
**Why it hurts:** plugin instances are per-Activity (comment at `AlphaLocalAgentPlugin.java:128-130`), so state is split
between instance and static fields under one lock; circular dependencies; impossible to reason about lifecycle.
**Examples:**
- `AlphaLocalAgentPlugin.java:46-58` statics `rootToken, ownerToken, ownerIdentity, lifecycleEpoch, credentialMutationEpoch,
  credentialShutdownRequest, uncertainCommitRequest, startRequestId...`.
- `AlphaCredentialStore` ↔ `AlphaLocalAgentPlugin` cycle: the store calls `AlphaLocalAgentPlugin.mutateCredentials`,
  `powerAuthorizationChanged`, `withCredentialSlotMutation`, `reserveCredentialIntent` (5+5+5+... calls), while the plugin
  constructs `new AlphaCredentialStore(...)` 19 times.
- `AlphaApplication.java:11` calls `AlphaDevicePlugin.UpdatePause.configure(base)`; `:22` `AlphaLocalAgentPlugin.invocationOwner`;
  `:26` `AlphaNoteAudioPlugin.scheduleTrashBackstop`.
- `ResidentScheduleReceiver.java:16-19` calls `AlphaLocalAgentPlugin.runtimePackaged` / `startResidentIfAdmissible`.
- `AlphaDevicePlugin.java:302-307, 393, 501-518` thirteen `static volatile` update-state fields.
- `GmailBackground` takes `AlphaLocalAgentPlugin.credentialLifecycleLock()`.
**Widespread:** 16 files call `AlphaLocalAgentPlugin.*` statically; 7 hand-rolled `static synchronized get()` singletons.
**Treatment:** extract `ResidentLifecycle` (static state, epoch, enrollment, shutdown fence), `CredentialAuthority`
(locks, intents, mutate/commit) and `AppUpdater` into plain application-scoped classes; plugins become thin bridges.
**Risk:** concurrency semantics are subtle and Quint-modelled; needs the resident instrumentation suites
(`ResidentServiceInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`) and the credential traces.

### P3. Monolith plugins with mixed responsibilities
- `AlphaLocalAgentPlugin.java` (1,371 lines): resident start/stop/shutdown fences (202-299, 694-982), provider settings UI
  methods (384-594), launch environment builder (595-693), voice transport (984-1008), canonical notification session
  (1033-1134), request gate (1191-1310), event subscriptions.
- `AlphaDevicePlugin.java` (857 lines): share/copy (24-48), text scale (49-59), device snapshot (67-97), settings pages
  (100-152), problem log/diagnostics (154-231) and a ~600-line self-updater (233-847) with nested `UpdatePause`,
  `UpdateActivation`, `UpdateResume`.
- `AlphaVoiceCloudPlugin.java` (349 lines) also hosts Notes recording methods (`startNoteRecording` … `saveNoteRecording`,
  99-146) that belong to `AlphaNoteAudioPlugin`, paired-agent speech (280-303), browser read-aloud (305-306) and a second
  `@CapacitorPlugin` (`Streaming`, 325-326) in the same file.
- `MainActivity.java` (479 lines): HOME-instance hand-off, renderer escape UI, insets, plugin registration, back dispatch.
**Treatment:** split by responsibility (see section 5).

### P4. Unreadable density (statement packing)
**Looks like:** whole methods, anonymous classes and multi-branch logic on one line.
- `SourceRenewalNotices.java:26` (1,273 chars), `AlphaMailAttachmentsPlugin.java:61` (1,269), `AlphaActionJournal.java:25`
  (1,217), `SourceRenewalHost.java:6` (1,048: a singleton, three anonymous classes and a lambda in one line),
  `HostedDelivery.java:15` (anonymous `Store` with three try/catch-rethrow methods on one line).
- `AlphaLocalAgentPlugin.java:1224` a single 1,097-character `if` combining route-table, regex allowlist, method and body
  checks.
- `GmailDeliveryWorker.java:9`, `HostedDeliveryWorker.java:8` whole WorkManager scheduling on one line.
**Widespread:** 562 lines >200 chars across main; every Hosted*/Calendar*/Workflow* file.
**Treatment:** run a formatter (google-java-format) as the first mechanical commit; it makes every later finding cheaper.
**Risk:** source-text tests (P1) will break on whitespace; that itself proves they should go.

### P5. Legacy install-compatibility for an install base that does not exist
**Context:** the package ID changed to `ai.alphacompute.alphaphone` on 2026-11-10 (commit `d3007eae6`, `app.config.json`
`appId` from `ai.elizaresearch.alphaphone`). README and PRD state the new package "starts with its own private data …
No app-data migration" (`docs/prd.md:55-58`, `README.md:76-80`). Every reader of data "earlier builds wrote" therefore
only serves installs of the new package made in the last day, plus whatever pilot devices were sideloaded.
**Examples (each is a legacy reader beside the current path):**
- `LegacyCloudRecovery.java` (82 lines) + `AlphaCredentialStore.java:79-80, 105, 135, 180, 196-216, 239` +
  `AlphaCloudSignInPlugin.java:74-125` (`savedSignInRecoveryStatus`, `restoreSavedSignIn`) + `ResetBeforeDispatch.java:17-57`
  ("retained pre-namespace production key"): restores a pre-namespace `cloud:production` slot.
- `AlphaCredentialStore.java:56-63` `retainedLimit`: "a document written under the earlier 32 MiB cap stays readable".
- `AlphaNoteAudioPlugin.java:20-23, 49-55, 231` `migrateLegacyMetadata` + `migrationStatus` plugin method + its worker.
- `AlphaFilesPlugin.java:21-28` `PREF="alpha-files-tree"` "Preference used by earlier installs"; `releaseRetiredTree` on every load.
- `AlphaMediaConfig.java:6-16` `.legacyCaptures("Pictures/")` "A scan reserved by an earlier install under Pictures/".
- `AlphaBrowserStores.java:28-35` `LEGACY_PREFIX="alpha_public_"` "Builds before P-04 … leftovers are purged at start";
  re-exported again at `AlphaBrowserPlugin.java:20-22`.
- `AlphaTelephony.java:6-9` "the plaintext journal it migrates from" (`"alpha-sms-sends.journal"`).
- `CalendarDeletionIdentity.java:3,12,29` numeric legacy identities (`legacy` flag, `encoded()` legacy branch).
- `AlphaDevicePlugin.java:288-294, 697, 738` update-session binding regex with optional `/intent` and `/automatic` marks for
  "Earlier bound builds".
- `NotesDeletionLease.java:17` rows "written before leases"; `AlphaActionJournal.java:54-55` "Preserve exact legacy terminal
  replays"; `NativeDigestSources.java:79` "Upgraded one-off alarms (legacyAlarm …)"; `AlphaLocalAgentPlugin.java:621`
  "Older payloads do not contain a workflow worker" (the build always packages one) and `:1200` "Omission preserves the
  legacy per-dispatch timeout".
- `AlphaAssistActivity.java:57-65` `takeInvocation()` "Legacy Agent read … Keep this old method", always returns `"assist"`.
- `AlphaListenerPlugin.java:5` "Legacy plugin name" (see delete candidates).
- Shim subclasses kept only for component-name stability: `sense/.../ListeningService.java` "Stable component identity
  across the shared Sense migration" (all six `android/sense` classes are empty subclasses).
- androidTest upgrade suites: `ReminderUpgradeInstrumentedTest`, `WorkflowLegacyReminderUpgradeInstrumentedTest`,
  `CalendarUpgradeInstrumentedTest`, `KeptCaptureLegacyPathInstrumentedTest`, `StorageLegacyAccessInstrumentedTest`,
  `CloudDeploymentStorageInstrumentedTest`, driven by `scripts/test-installed-upgrade.ts`.
**Treatment:** with an owner decision that no pre-rename-format data exists under the new package, delete all of the
above and freeze the current formats as v1. If pilot phones did install early new-package builds, define a cut-off
version and delete readers older than it.
**Risk:** a pilot that already installed an early `ai.alphacompute` build could lose a sign-in or Notes audio metadata.
Verify against the retained pilot inventory (`scripts/pilot-update.ts`, `release/DataIntegrityProvider`).
The AOSP `AlphaQsDefaultsPolicy.java:17` legacy tile migration is different: it migrates OS Settings across an image
update, which plausibly does carry over; keep unless the retained pre-rename image is retired.

### P6. "Installed identity" constants and versioned keys everywhere
**Looks like:** every slot, channel, action, prefix and preference carries a `:v1`/`-v1`/`-v3` suffix and a comment that it
"must never change", plus literal duplicates of the same key.
- `"cloud:production"` literal appears 32 times in 9 files (11 in `AlphaCredentialStore`, 9 in `AlphaLocalAgentPlugin`).
- `"local-agent-provider:v1"` literal 13 times although `LocalAgentProviderAdmission.PROVIDER_SLOT` exists
  (`AlphaLocalAgentPlugin.java:190,358,460,644`, `AlphaVoiceCloudPlugin.java:52,249,338`, `KeyboardDictationCloud.java:33,51`,
  `LegacyCloudRecovery.java:12`, `CloudDeployment.java:26`).
- `AlphaCredentialStore.slotLimit` (`:32-52`) hard-codes per-slot caps as a regex/if ladder separate from the slot owners.
- `RendererCredentialSlots.java:13-30` maintains a third list of the same namespaces.
- `AlphaApplication.java:24` `"alpha-native-voice-timing-v3"`; `AlphaReminders.java:12` `"alpha-reminder-envelope-v1"`.
**Treatment:** one `Slots` constants class (name, cap, renderer policy) used by store, policy and owners. With P5
resolved, drop version suffixes from names that never had a v0 under this package (optional; low value vs churn).

### P7. Duplicated "slot store adapter" glue
**Looks like:** each upstream engine defines its own `read/write(slot)` interface and Alpha adapts `AlphaCredentialStore`
to it with an anonymous class.
- `AlphaReminders.java:16-23`, `AlphaTelephony.java:28-32`, `AlphaActionJournal.java:16-18`, `NativeDeletionCoordinator.java:27-28`,
  `AlphaNoteAudioPlugin.java:40-43`, `AlphaCloudSignInPlugin.java:59`, `HostedDelivery.java:15` (three methods, each wrapping
  into `HostedStorageFault`), `GmailBackground.java:22-25`, `WorkflowNoticeTapsFactory.java:4`, `SourceRenewalHost.java:6`,
  `AlphaNotificationsPlugin.java:41`, `NativeOwnerReminderHost.java:21`.
- Product-local copies of the same interface: `NativeDigestSources.Storage` (`:10`), `HostedInbox.Store` (`:8`),
  `HostedResultNotices.Storage` (`:14`), `SourceRenewalNotices.Store` (`:11`), `GoogleWorkspaceReturnFlow.Store` (`:16`),
  `WorkflowNoticeDelivery.Storage` (`:13`, an empty re-alias of upstream `NoticeDelivery.Storage`).
**Treatment:** upstream: one `SecureSlots` interface for all shared engines; Alpha: `AlphaCredentialStore implements` it.
Until then a single `AlphaCredentialStore.asSlots()` helper replaces the 12 anonymous classes.

### P8. Re-implemented "owner foreground" checks
**Looks like:** each plugin decides "unlocked, resumed, focused, not finishing" its own way, with different subsets.
- `AlphaDevicePlugin.java:30-35` `shareForeground`; `AlphaLocalAgentPlugin.java:512-520` `requireProviderOwner`;
  `AlphaGmailPlugin.java:22` `foreground`; `AlphaDeletionsPlugin.java:98`; `CalendarSyncBridge.java:48`;
  `CalendarScopedDeletionReview.java:25-26`; `AlphaCalendarPlugin.java:112` `unlocked`; `ClockAgentReview.java:50`;
  `AlphaHostedResultsPlugin.java:37`; `AlphaKeyboardDictationService.java:112`.
- Some use `isKeyguardLocked`, some `isDeviceLocked`, some both; some check `hasWindowFocus`, some lifecycle state.
**Treatment:** one `OwnerSurface.check(activity, requireFocus)` helper with the strictest common definition.
**Risk:** behaviour differences may be intentional (assistant over lock screen); audit each call against its PRD flow.

### P9. Copy-pasted low-level helpers
- **SHA-256 / hex:** `AlphaDevicePlugin.java:212-218` (`assetSha256`), `:240` (`hex` via `BigInteger`), `:244-255`,
  `:282-286`, `:322-326` (four digests in one file); `WorkflowWorkerAssets.java:26-27` (own `hex` with `String.format`);
  `HostedResultNotices.java:31`; `CalendarSyncSnapshot.java:140`; `AlphaCredentialStore.java:159`;
  `GoogleWorkspaceReturnFlow.java:33`; `AlphaMailAttachmentsPlugin.java:54` (delegates to upstream `DocumentBytes.sha256`,
  which already exists).
- **Bounded stream read:** `AlphaDevicePlugin.java:202-205`, `AlphaLocalAgentPlugin.java:595-603`, `AlphaVoiceCloudPlugin.java:164`,
  `KeyboardDictationCloud.java:92`, `HostedTransport.java:30`, `WorkflowWorkerAssets.java:29`, `AlphaNoteRecorder.java:121`.
- **HttpURLConnection setup** (timeouts, no redirects, no cache): `AlphaConnectionPlugin.java:226,294`,
  `AlphaVoiceCloudPlugin.java:206,280`, `KeyboardDictationCloud.java:76`, `AlphaMapsTransportPlugin.java:52`,
  `HostedTransport.java:12-18`, although OkHttp 5 is an app dependency (`consumer-host.json` dependencies) and is not
  used by any product file.
- **Exception-family classification:** `NativeNotificationDiagnostics.java:7` and `:12` (identical expression twice in one
  file), `AlphaLocalAgentPlugin.java:30-35`.
- **HTTP status clamp** `status>=100&&status<=599?status:0`: `AlphaLocalAgentPlugin.java:28`, `NativeNotificationDiagnostics.java:23`.
- **Identifier regexes inline:** `matches("[a-f0-9]{64}")` 17 times; UUID patterns at `AlphaLocalAgentPlugin.java:1127`,
  `GoogleWorkspaceReturn.java:26`, `NativeNotificationSession.java:51`, `PairedAgentCredential.java:23`, plus
  `"[a-f0-9-]{36}"` variants (`AlphaLocalAgentPlugin.java:762,769`, `HostedDelivery.java:45`).
- **Calendar READ+WRITE permission check:** `CalendarSyncBridge.java:47,219`, `CalendarScopedDeletionReview.java:24`,
  `NativeDigestHost.java:33,35`, `AlphaCalendarPlugin.java:111`.
- **WorkManager periodic+catch-up scheduling:** `GmailDeliveryWorker.java:9` and `HostedDeliveryWorker.java:8` are the same
  code with different names.
**Treatment:** a small `ai.alphacompute.alphaphone.util` (`Digests`, `BoundedIo`, `Ids`, `Http`) or use the upstream
helpers that already exist.

### P10. Thread/executor boilerplate per plugin
**Looks like:** every plugin creates its own executor (25 executors in main), plus three different "rejected after
destroy" strategies.
- Executors: `AlphaConnectionPlugin.java:127` (4 threads), `AlphaLocalAgentPlugin.java:41-43` (3 pools),
  `AlphaMapsTransportPlugin.java:22-25` (3 pools), `AlphaDevicePlugin.java:154,499`, `AlphaDeletionsPlugin.java:14`, and
  single-thread executors in 12 more files.
- Strategies: `PluginWorkers.submit` (13 call sites); `SerialStorageTasks` (a second, stateful variant used once in
  `AlphaConnectionPlugin`); raw `try{io.execute(...)}catch(RejectedExecutionException ignored){}` in
  `AlphaGmailPlugin.java:33-34`, `AlphaDeletionsPlugin.java` (4), `CalendarScopedDeletionReview.java` (2),
  `AlphaCalendarPlugin.java`, `CalendarSyncBridge.java`, `AlphaMapsTransportPlugin.java`.
- Per-plugin `submit(call, work)` wrappers: `AlphaGmailPlugin.java:17-21` (`Work`), `AlphaDeletionsPlugin.java:19` (`Task`),
  `AlphaFilesPlugin.java:36` (`StorageWork`), `AlphaDevicePlugin.java:161-163` (`diagnostics`).
**Treatment:** one base `AlphaPlugin` (or helper) with `background(call, work)` that owns the executor, shutdown and
the closed-bridge rejection; delete `SerialStorageTasks` unless strict ordering is required there.

### P11. Defensive catch-and-ignore / catch-all to fixed message
- 52 empty or comment-only catch blocks in product code (`AlphaDevicePlugin` 9, `AlphaNoteRecorder` 7,
  `AlphaCanonicalNotifications` 5, `AlphaMailAttachmentsPlugin` 3, `AlphaLocalAgentPlugin` 3 …). Examples:
  `AlphaApplication.java:25-26` (`catch(RuntimeException unavailable){/* … */}` around coordinator start and trash backstop);
  `AlphaDevicePlugin.java:168` (exit history), `:207` (upstream pin), `:316` (update reconcile);
  `AlphaCanonicalNotifications.java:53, 60, 84, 186`; `AlphaNoteRecorder.java:213, 254, 286, 290`;
  `AlphaGmailPlugin.java:33`; `HostedDeliveryWorker.java:16` (`catch(Exception ignored){/* A denied channel … */}`).
- 18 `catch(Exception x){return false|null;}` predicates (e.g. `AlphaLocalAgentPlugin.java:107,117`,
  `CalendarZones.java:12`, `AlphaDevicePlugin.java:275-276` catches `SecurityException` and `RuntimeException` separately
  to return the same `false`).
- Nearly every `@PluginMethod` ends in `catch(Exception …){call.reject("<fixed text>")}`, discarding the cause; the
  "diagnostic" classes then reconstruct a category by hand (P9).
- `AlphaLocalAgentPlugin.java:327-328, 497-498` `catch(JSONException impossible){throw new IllegalStateException(impossible);}`
  around round-tripping a `JSONObject` into a `JSObject`.
- `AlphaLocalAgentPlugin.java:692` wraps the whole environment build in `catch(Exception error){throw new IOException("Local
  model provider unavailable");}` after inner blocks already chose "launch unbound".
**Treatment:** keep catches only where Android genuinely throws on a documented race (MediaRecorder.stop, executor
after destroy); let others propagate to one per-plugin rejection helper that logs class name.

### P12. Test-only and fixture code in the main source set
- `AlphaLocalAgentPlugin.java:44-45` `static volatile ServerSocket instrumentationRecoveryEndpoint` and `:680-689` the
  environment branch that redirects Cerebras/OpenAI to it; `:151-160` `ownedWorkCount`, `adoptStreamForTest`,
  `enrollForTest`, `launchedGenerationForTest`, `lifecycleEpochForTest`, `attachForTest` (guarded only by
  `BuildConfig.DEBUG`, not by the test-mocks switch AGENTS.md requires).
- `AlphaVoiceCloudPlugin.java:57-58, 197, 205` `instrumentationBaseUrl`, `instrumentationCredentialSlot` fields.
- `IsolatedPdfService.java:13` `stallFixture` ("watchdog") hook.
- `CalendarCreationStore.java:7` "Compatibility entrypoint for installed-state acceptance tests".
- `SelectedDocumentAccess.java:16,39` "for instrumentation"; `AlphaNavigationService.java:68` "Instrumentation-visible state".
- `MainActivity.java:358-361` reflective `PasswordTransferPlugin` registration under test mocks.
**Treatment:** move hooks to the existing `testMocks` source set (`consumer-host.json` `testMocks.debug.java`), or drop
the tests that need them. At minimum gate on `ELIZA_DEV_ALLOW_TEST_MOCKS`.

### P13. Capability gating duplicated and inconsistent
- Two near-identical wrappers around the same upstream `ImageCapability`: `AlphaImageCapability.java` (`verified` =
  `IMAGE.admitted`, `featureName`, `UNAVAILABLE`) and `AlphaImageCapabilities.java` (`IMAGE`, `aospImage` =
  `IMAGE.provisioned`, `roleEnabled`, `defaultAppEnabled`). Names differ by one letter, semantics differ (admitted vs
  provisioned).
- `AlphaImageCapabilities.java:21-22` says Telecom/SMS roles remain unavailable (`roleEnabled` only `home`/`assistant`), and
  `AlphaDeviceAppsPlugin.java:21` hard-codes `phone:false, sms:false`, yet the launcher manifest declares the dialer and SMS
  role components and `AlphaTelephonyRoles.sync` enables them on the verified image.
- `BuildConfig.IS_LAUNCHER` checks are scattered (`AlphaDevicePlugin.java:99,128`, `AlphaSystemPlugin.java` four overrides,
  `AlphaDeviceAppsPlugin.java:26`, `MainActivity.java:73`) instead of living in flavor source sets (which already exist
  for `AlphaTelephonyRoles`).
**Treatment:** one `AlphaImage` class exposing a single admitted decision; resolve whether provisioning-only admission is
still needed; move launcher-only behaviour to `src/launcher`.

### P14. Dormant features kept live in production code
- `AlphaAssistActivity` (84 lines), `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile` are `android:enabled="false"` with no
  enabler (`AndroidManifest.xml:285, 315, 320`), and the code paths behind them remain: `AlphaLocalAgentPlugin.PowerLaunchPin`
  and `capturePowerLaunchPin` (`:101-118`), `launchSurface`/`takeInvocation` (`:332-348`), `AlphaSystemPlugin.isAssistantLaunch`.
- The renderer never calls `Agent.takeInvocation` or `Agent.launchSurface`; it uses `Sense.takeInvocation`
  (`apps/app/src/runtime/always-on-listener.ts:56`).
- Deferred Wallet/Contacts/Phone paths: `ContactsFlowInstrumentedTest` is `@Ignore` (per
  `scripts/android-instrumentation.ts`), `AlphaContactsPlugin` registered on every build (`MainActivity.java:331`).
**Treatment:** owner decision on P-78 (wake listening and Power entry) and Contacts; if deferred, delete the
activities, tile, pin logic and their tests, and restore them from git when the feature lands.

### P15. Native paths serving renderer features that exist only under test mocks or contradict the PRD
- Paired/hosted agents: the PRD says "No hosted-agent pairing" and Cloud "never hosts Alpha's agent" (`docs/prd.md:11,17`).
  Native code still supports `remote:<origin>` paired agents and `cloud-runtime:<session>` Cloud-hosted agents:
  `PairedAgentCredential.java:14-33`, `PairedSpeechContract.java`, `AlphaVoiceCloudPlugin.java:276-303`
  (`pairedVoiceStatus`, `pairedTranscriptionStatus`, `transcribePairedRecording`, `synthesizePaired`),
  `HostedDelivery.java:50-52` (`remote`, `cloud`, `resident` modes), `NativeDeviceEnrollmentKey.cloud`.
  In the renderer the Cloud-runtime connection is written only under `testMocksEnabled`
  (`apps/app/src/runtime/connection-ui.tsx:825`, `hosted-digest-ui.tsx:289`), while paired speech is still wired
  (`apps/app/src/runtime/paired-voice.ts`).
- androidTest carries six `Paired*` classes; three of them are "not run by any runner" (below).
**Treatment:** owner decision; if pairing is a developer surface, move it behind test mocks end to end, otherwise
delete `remote`/`cloud` modes and keep only `resident`.

### P16. Parallel notification pipelines
Seven separately built notice systems, each with its own channel, tap ledger slot, owner slot, poster and worker:
`AlphaReminders` (upstream ReminderEngine), `WorkflowNotice{Delivery,Taps,TapsFactory,Poster}`,
`AlphaHostedResultsPlugin` + `Hosted{Delivery,Inbox,Transport,NoticePoster,ResultNotices,DeliveryWorker,DeliveryCancelled,StorageFault}`,
`SourceRenewal{Notices,Host}`, `AlphaCanonicalNotifications` + `NativeNotificationSession` + `NativeNotificationDiagnostics`,
`GmailBackground` + `GmailDeliveryWorker` (MailNoticePoster), `NotificationAccess` (listener mirror).
Several are already shared upstream (`NoticeRoutes`, `HostNoticePoster`, `NoticeDelivery`); the Hosted* family is
product-local and largely duplicates them. **Treatment:** after P15, collapse Hosted* onto the shared notice delivery
or delete it with the remote/cloud modes.

### P17. One-class wrappers and pass-through facades
- `NotificationAccess.java:13-33` re-exports 16 `MIRROR.*` methods one-to-one.
- `OwnerRoutes.java` wraps `OwnerRoutePolicy` (`interface Assets extends OwnerRoutePolicy.Assets {}`).
- `CalendarCreationStore.java` three static forwards to the upstream store.
- `RendererCredentialSlots.java:33-37` three forwards to `POLICY`.
- `AlphaBrowserPlugin.java:18-23` re-exports `AlphaBrowserStores` constants.
- `WorkflowNoticeDelivery.Storage/Poster` empty re-alias interfaces; `LocalAgentProviderAdmission` is an empty subclass
  carrying one constant.
- Empty component subclasses: `AlphaListenerPlugin`, six `android/sense` classes, `ReminderReceiver`,
  `AlphaNotificationListener`, `AlphaCallActivity`, launcher SMS/MMS receivers (most have a one-method config hook, which
  is fine; the empty ones are not).
**Treatment:** call upstream directly; for manifest components with no override, reference the upstream class name in
the manifest (only once P5 removes the "installed name" constraint).

### P18. Workarounds re-applied per plugin instead of fixed upstream
`LateLaunch.ask` wrappers (21 uses in 11 files) override `requestPermissions`, `requestRole`, `setFlashlight` etc. in each
subclass (`AlphaSystemPlugin.java:23-25`, `AlphaFilesPlugin.java:24`, …) and `closedMessage()` overrides on every media
plugin. `PluginWorkers` exists for the same "call after destroy" Capacitor issue. **Treatment:** fix once in the upstream
base plugin (or a single Alpha base class).

### P19. Build-script over-engineering in `product.gradle`
- `product.gradle:43-79` a 37-line hand-rolled file-integrity routine (no-follow open, inode/mtime re-check, uid/mode check,
  signed-URL query parse) for a "private-qa" update channel used only for QA.
- `:8-9, 151-160` guards that refuse the removed runtime-profile properties and stale renderer assets "for the removed
  Cloud profile" (legacy refusal paths).
- Four `Exec` tasks spawn Node on every `preBuild` (`:117-149`).
- `proguard-rules.pro:39` keeps `ElizaTasksWorker` and `:20` `ai.elizaos.plugins.**`, neither found anywhere in this
  repository (suspicion: may exist in generated/upstream sources); `:28-35` hand-keeps manifest components that AGP keeps
  automatically; `:67-68` keeps all of `androidx.**`, which defeats most minification.
**Treatment:** move QA-channel admission into the Node script that sets the env var; drop removed-option refusals once
callers are updated; trim ProGuard to what R8 cannot infer.

### P20. Instrumentation suite: dead, diagnostic and pure-logic tests
- `scripts/android-instrumentation.ts:323-342` `NOT_RUN_BY_A_RUNNER` lists 18 classes that no runner executes, several with
  runners removed long ago ("its runner was removed with the smoke suites in 49b1bf4c"; "compiled, never executed").
- Pure logic tests packaged as instrumentation: `ResidentModelResponseContractTest` tests a test helper
  (`ResidentModelResponseContract.java`); `HostedResultsLifecycleInstrumentedTest` constructs a plugin with `null` bridge
  and checks rejection text; `ReminderDeletionJournalInstrumentedTest` only forwards to
  `androidTest/java/ai/eliza/plugins/reminders/ReminderDeletionJournalFixture.java`, which reaches into upstream
  package-private state (so Alpha is testing upstream internals).
- 55 of 187 test classes never start an Activity or UI; they exercise storage/Keystore through Context (integration-ish
  but often unit-level).
- Duplicate helpers: 62 test files define their own `js(`/`eval(`/`evaluate(` WebView helper (37 `String js(`, 25
  `String eval(`) although `WebViewTestDriver` (used by 122 files) exists; 13 private `waitFor(` copies.
- Clusters that likely overlap: 18 `Browser*`, 16 `Reminder*`, 12 `Calendar*`, 7 `Workflow*` (process-death and tap
  variants), 4 `Accessibility*`.
**Treatment:** delete the never-run classes; fold helper copies into `WebViewTestDriver`; delete tests of upstream
internals (they belong upstream); merge per-feature clusters into one journey test each.

---

## 3. Delete candidates

Confident (whole-repo greps show no production need):

| Item | Evidence |
| --- | --- |
| `app/src/main/.../NativeReadEpoch.java` | Not referenced by any file under `android/` except itself. References only in `test/native-read-epoch.test.mjs`, `test/fixtures/NativeReadEpochTest.java`, Quint manifests/traces. Prior audit `docs/formal-model-audit-2026-11/07-native.md:38` already notes media code does not use it. |
| `AlphaListenerPlugin.java` + `MainActivity.java:355` registration | Renderer uses only `ElizaSense` (`apps/app/src/runtime/always-on-listener.ts:9`); `"AlphaListener"` appears nowhere in `apps/`. Refs only in `test/always-on-listener.test.mjs:29`, `test/support/feature-parity.mjs:66`, `specs/quint/native/manifest.json:219,260`. |
| `AlphaLocalAgentPlugin` delegates with no production caller: `PROVIDER_MODEL_PATTERN` (483), `CLOUD_PROVIDER_BASE` (433), `applyProviderEnvironment` (482), `providerCheckFailure` (300), 4-arg `saveVerifiedProvider` (323), `providerIdentity` (496-499) | Grep of `android/app/src/main` finds only the declaration. Callers are `LocalAgentProviderInstrumentedTest` and source-slicing host tests. |
| `*ForTest` methods and `instrumentationRecoveryEndpoint` in `AlphaLocalAgentPlugin.java:44-45,151-160,680-689` | Used only by `AssistantInstrumentedTest`, `AssistantResidentReuseInstrumentedTest`, `ResidentWorkflowCrashInstrumentedTest`, Quint `CredentialResidentTraces.java`. Move to testMocks or delete with the tests. |
| `video-fixture` module (APK, `VideoFixtureActivity`, 2 androidTest classes, `qa-long.mp4` 362 KB) | No script, workflow or package.json builds or runs `:video-fixture` or the `videoqa` packages (grep for `videoqa`, `alphaVideoFixturePackage`, `VideoCopyInstrumentedTest`: only inside the module). Only `qa-source.mp4` is read, by `test/browser/media-polish.spec.ts` and `native-video-library-change.spec.ts` (listed in `scripts/ci/affected.ts:14`); move that one file to `test/fixtures/`. `qa-long.mp4` has no reader. |
| `android/notification-fixture/synthetic-media-provenance.json` | No reader anywhere (provenance note only). |
| 13 instrumentation classes listed as never run (`scripts/android-instrumentation.ts:324-341`): `PosterCalendarJourney` (204 lines, drives a removed Camera Scan mode), `AllViewAgentContext`, `CombinedAgent`, `CombinedAgentRestart`, `ContactsFlow` (@Ignore), `DeviceAction`, `LiveAgent`, `PairedMaps`, `PairedReminder`, `RemoteAgent`, `SpeechPipelineTrace`, `VoiceFloatPathDiagnostic`, `LocalServerSocketRelease` (~1,360 lines) | The runner itself records that no runner can run them; several runners were removed in `49b1bf4c`. Then delete the `NOT_RUN_BY_A_RUNNER` entries. |
| `ResidentModelResponseContractTest.java` | Tests a test helper; nothing in product code. |
| `android/aosp/branding/*/test_*.py` (`core-launcher/test_policy.py` 221, `system-entry/test_native_plan.py` 187, `hidden-navigation-handle/test_hidden_handle.py` 123) | Not run by `scripts/run-node-tests.ts`, `test/python-suites.test.mjs` or any workflow; READMEs say run by hand. Either wire into `python-suites` or delete. |
| `custom_url_scheme` string in `res/values/alpha-canonical-notifications.xml` | No reader in `android/`, `scripts/` or `consumer-host.json` (suspicion: Capacitor template convention; check upstream generator). File name is misleading regardless. |
| `AppTheme.NoActionBar` style (`res/values/styles.xml`) | No reference found (suspicion, same caveat). |

Delete after an owner decision (legacy/dormant):

| Item | Replaced by / reason |
| --- | --- |
| `LegacyCloudRecovery.java`, the legacy branches in `AlphaCredentialStore`, `ResetBeforeDispatch.readLegacyCloudSlot/distinctCredential`, `AlphaCloudSignInPlugin.savedSignInRecoveryStatus/restoreSavedSignIn` and renderer callers | Pre-namespace sign-in of the old builds; the new package has no such data (P5). |
| `AlphaNoteAudioPlugin.migrateLegacyMetadata`, `migrationStatus`, `migrationWorker` | Pre-shared-store note audio metadata (P5). |
| `AlphaFilesPlugin.PREF` / `releaseRetiredTree` | "Preference used by earlier installs" (P5). |
| `AlphaMediaConfig .legacyCaptures("Pictures/")`, `AlphaBrowserStores.LEGACY_PREFIX` (+ re-export in `AlphaBrowserPlugin`), `AlphaCredentialStore.retainedLimit`, `CalendarDeletionIdentity` legacy numeric form, `AlphaTelephony` plaintext journal source, optional update-binding marks in `AlphaDevicePlugin.UPDATE_BINDING` | All read formats older than the current writer (P5). |
| Upgrade instrumentation (`ReminderUpgrade`, `WorkflowLegacyReminderUpgrade`, `CalendarUpgrade`, `KeptCaptureLegacyPath`, `StorageLegacyAccess`) and `scripts/test-installed-upgrade.ts` legacy seeds | Only meaningful with P5 readers. Keep a generic "update keeps data" test. |
| `AlphaAssistActivity`, `AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`, `PowerLaunchPin`, `Agent.launchSurface`, `Agent.takeInvocation`, `AlphaAssistActivity.takeInvocation` | Disabled under P-78; renderer uses `Sense.takeInvocation`. `launchSurface`/`takeInvocation` callers outside tests not found (suspicion: `.eliza/client-features` unverifiable here). |
| Paired/remote and Cloud-runtime agent support (`PairedAgentCredential`, `PairedSpeechContract`, paired methods in `AlphaVoiceCloudPlugin`, `HostedDelivery` `remote`/`cloud` modes, `NativeDeviceEnrollmentKey.cloud`, `Paired*` tests) | PRD forbids hosted-agent pairing (P15). |
| `AlphaGmailPlugin.notificationSettings`, `AlphaDevicePlugin.reconcileUpdate` plugin methods | No reference anywhere in the repo outside the declaring file (suspicion: generic `.eliza` client code). |

---

## 4. Duplicated types and helpers

| Name | Locations | Proposed home |
| --- | --- | --- |
| Slot read/write store interface | `NativeDigestSources.Storage` (`:10`), `HostedInbox.Store` (`:8`), `HostedResultNotices.Storage` (`:14`), `SourceRenewalNotices.Store` (`:11`), `GoogleWorkspaceReturnFlow.Store` (`:16`), `WorkflowNoticeDelivery.Storage` (`:13`) plus 12 anonymous adapters (P7) | One upstream `SecureSlots` interface; `AlphaCredentialStore` implements it. |
| "check() throws" guard | `NativeDigestSources.Guard`, `HostedInbox.Fence`, `HostedTransport.Guard`, `ResidentCredentialShutdownRetry.Guard`, `ResidentResultSession.Guard`, `AlphaCanonicalNotifications.ForegroundCheck`, `SourceRenewalNotices.Guard` (different shape), and `Runnable assertOwner` in `AlphaCredentialStore` | One `Guard` functional interface (or `Runnable`). |
| Background work lambdas | `AlphaGmailPlugin.Work`, `AlphaDeletionsPlugin.Task`, `AlphaFilesPlugin.StorageWork`, `AlphaLocalAgentPlugin.ProviderChange`, `HostedDelivery.NativeSourceWork` | Base-plugin `background(call, Callable<JSObject>)`. |
| Owner-foreground predicate | 10 copies (P8) | `OwnerSurface` helper. |
| SHA-256 + hex | 10 copies (P9) | `Digests` util, or upstream `DocumentBytes.sha256`. |
| Bounded `InputStream` read | 7 copies (P9) | `BoundedIo.read(in, limit)`. |
| WorkManager periodic + catch-up | `GmailDeliveryWorker.schedule`, `HostedDeliveryWorker.schedule` | One `Workers.schedule(name, class, data, network)` helper. |
| Exception-family / status diagnostics | `NativeNotificationDiagnostics` (twice), `AlphaLocalAgentPlugin.ResidentAttachDiagnostic` | One `Diagnostics.family(Throwable)` / `httpStatus(int)`. |
| ID validators | 17× `[a-f0-9]{64}`, 4+ UUID regexes, `[a-f0-9-]{36}` | `Ids.sha256Hex`, `Ids.uuid`. |
| Image capability | `AlphaImageCapability` and `AlphaImageCapabilities` | Single `AlphaImage`. |
| Credential lifecycle lock order | `AlphaLocalAgentPlugin.withCredentialAuthority`, `withCredentialRead`, `withCredentialSlotMutation`, `mutateCredentials` (four entry points, two locks each) | `CredentialAuthority` class. |
| Rejected-executor strategy | `PluginWorkers`, `SerialStorageTasks`, raw `catch(RejectedExecutionException)` in 7 files | One helper. |
| `AlphaPhotosPlugin` / `AlphaPhotoLibraryPlugin` permission blocks | identical four `@Permission` aliases (`AlphaPhotosPlugin.java:16-20`, `AlphaPhotoLibraryPlugin.java:11-16`) | Shared constant (Capacitor requires per-plugin annotation; at least share the alias strings). |
| Provider slot readers | `"local-agent-provider:v1"` read + parse in `AlphaLocalAgentPlugin` (4), `AlphaVoiceCloudPlugin` (3), `KeyboardDictationCloud` (2) | `ProviderSelection.read(store)`. |

---

## 5. Structure / foldering

- **Flat package of 131 classes** (`ai.alphacompute.alphaphone`, only `release/` as a subpackage). Group into
  `agent/` (resident lifecycle, request gate, provider settings), `credentials/` (store, authority, slots, recovery),
  `notices/`, `calendar/`, `media/` (photos, notes audio, recorder), `voice/`, `update/`, `telephony/` (launcher),
  `browser/`, `util/`.
- **Split monoliths:**
  - `AlphaLocalAgentPlugin` → `ResidentLifecycle` (static state, start/stop/shutdown, enrollment), `CredentialAuthority`
    (locks, intents, mutate), `ProviderSettingsPlugin` methods, `ResidentLaunchEnvironment` (`configureEnvironment`),
    `ResidentRequestGate` (the 1,097-char route `if`), `CanonicalNotificationSession`.
  - `AlphaDevicePlugin` → `AppUpdater` (+ `UpdatePause`, `UpdateActivation`, `UpdateResume`, `AlphaUpdateStatusReceiver`,
    `UpdateConfirmationReceipt`), `DiagnosticsPlugin`/problem log, device facts and share.
  - `AlphaVoiceCloudPlugin` → move Notes recording to `AlphaNoteAudioPlugin`; move `Streaming` to its own file.
  - `MainActivity` → extract HOME-instance hand-off and renderer-escape UI.
- **Merge tiny files:** `HostedDeliveryCancelled`/`HostedStorageFault` (2-line exceptions) into `HostedDelivery`;
  `NativeVoiceBinding` + `VoiceEventAdmission` (one boolean expression each); `WorkflowNoticeTapsFactory` into
  `WorkflowNoticeTaps`; `SourceRenewalHost` into `SourceRenewalNotices`; `CalendarZones` (one method) into its caller;
  `AlphaImageCapability` + `AlphaImageCapabilities`; `GmailBackground` + `GmailDeliveryWorker`;
  `CloudSpeechPolicy` + `KeyboardDictationPolicy` + `CloudVoiceLimit` into one voice-policy class.
- **Misleading names:** `res/values/alpha-canonical-notifications.xml` holds `custom_url_scheme`; "Hosted" means three
  different agent modes; `AlphaImageCapability` vs `AlphaImageCapabilities`; `AlphaDeviceAppsPlugin` registers the
  Capacitor name `DeviceApps` but lists no apps (`AlphaDeviceAppsPlugin.java:14-16`); `CalendarCreationStore` is a test
  compatibility facade; `LocalAgentProviderAdmission` is a constant holder.
- **Wrong place:** `androidTest/java/ai/eliza/plugins/reminders/*` tests upstream package-private internals from the
  product repo; `test-mocks` hooks living in `main` (P12); `video-fixture/src/main/assets/qa-source.mp4` is a browser-test
  fixture living in an unused Android module.
- **Fixture modules:** `private-peer-fixture` is used by `.github/workflows/resident-android.yml:413` (keep);
  `notification-fixture` is built only by the manual `scripts/build-notification-fixture.ts` →
  `scripts/test-cross-app-notifications.ts` campaign, no CI (keep only if that campaign is still wanted);
  `video-fixture` is unused (delete); `sense`/`sense-speech` are development-only while P-78 stands.

---

## 6. Worst offenders

1. `app/src/main/.../AlphaLocalAgentPlugin.java` — 1,371 dense lines, static god state, five responsibilities, test hooks, dead delegates, 1,097-char gate.
2. `AlphaDevicePlugin.java` — device facts plus a ~600-line self-updater with 13 static volatile fields; four SHA-256 copies.
3. `AlphaCredentialStore.java` — cyclic with the agent plugin, legacy recovery branches, hard-coded per-slot cap ladder.
4. `AlphaVoiceCloudPlugin.java` — voice, Notes recording, paired speech, browser read-aloud and a second plugin in one file.
5. `HostedDelivery.java` / `HostedInbox.java` / `HostedTransport.java` — 900+-char lines, three agent modes incl. PRD-forbidden ones.
6. `AlphaConnectionPlugin.java` — transport, Google Workspace return flow, delegation callback and storage in one plugin.
7. `MainActivity.java` — HOME hand-off, escape UI, insets, registration, back dispatch.
8. `AlphaCanonicalNotifications.java` — static schedulers, five swallowed catches, tap timing state.
9. `SourceRenewalNotices.java` / `SourceRenewalHost.java` — 1,000+-char single lines.
10. `AlphaMailAttachmentsPlugin.java` — 1,269-char line, local hash wrapper.
11. `AlphaActionJournal.java` — 1,217-char line, legacy replay rule.
12. `AlphaNoteAudioPlugin.java` — legacy migration worker, nested WorkManager worker.
13. `AlphaNoteRecorder.java` — seven ignored catches.
14. `LegacyCloudRecovery.java` + `ResetBeforeDispatch.java` — legacy-only paths for a package with no legacy data.
15. `AlphaImageCapability.java` + `AlphaImageCapabilities.java` — twin gates with diverging semantics.
16. `CalendarSyncBridge.java` (+ `CalendarSync*` six files) — duplicated permission/foreground checks, raw executor rejects.
17. `AlphaGmailPlugin.java` — unused `notificationSettings`, raw `RejectedExecutionException` swallowing.
18. `AlphaAssistActivity.java` / `AlphaPowerVoiceActivity.java` / `AlphaQuickSettingsTile.java` — disabled code paths.
19. `android/app/product.gradle` — 37-line private-QA file check, legacy option refusals.
20. `android/app/proguard-rules.pro` — keeps for absent classes, `androidx.**` wholesale.
21. `android/video-fixture/` — unused module.
22. `androidTest/.../*` never-run classes (13) and the 62 private `js/eval` helper copies.
23. `androidTest/java/ai/eliza/plugins/reminders/*` — tests of upstream internals.
24. `android/sense/src/...` — six empty identity subclasses.

---

## 7. Open questions / risks

1. **Installed base under `ai.alphacompute.alphaphone`.** Did any pilot or tester install a new-package build before
   2026-11-10's rename landed in their channel? If none, every P5 legacy reader can go now. `README.md:76-80` and
   `docs/prd.md:55-58` say no migration; the code says otherwise.
2. **P-78 (wake listening / Power entry).** Not in `docs/prd.md` (which lists P-57…P-76 and AP-06 "AOSP always-on
   listening and hardware invocation included"). Keep the dormant assistant/power/tile code or delete it?
3. **Paired and Cloud-hosted agents.** PRD forbids hosted-agent pairing; renderer still wires paired speech and native
   still supports `remote`/`cloud` result modes. Product feature, developer surface, or delete?
4. **Image capability semantics.** Is provisioning-only admission (`AlphaImageCapabilities.aospImage`) still needed
   next to the verified admission? Should `platformCapabilities` report phone/sms on the image now that roles are enabled?
5. **Testing strategy for Java.** Removing P1 seams means deleting ~46 javac host tests, ~51 source-text tests and
   rewriting the Quint native refinement manifests (86 pinned files). Owner wants e2e/integration only; confirm that
   formal refinement over Java classes is also expected to shrink.
6. **Upstream ownership.** Several fixes belong in `vendor/eliza` (one slot interface, `LateLaunch`/after-destroy handling in
   the base plugin, notice pipelines). Those require an upstream PR and a new pin per AGENTS.md.
7. **Unverifiable here.** `vendor/eliza` and `.eliza/` are not checked out in this worktree, so `launchSurface`,
   `takeInvocation`, `notificationSettings`, `reconcileUpdate`, `custom_url_scheme`, `AppTheme.NoActionBar`,
   `ElizaTasksWorker` and the app-level OkHttp/media3/credentials dependencies must be re-checked against the generated
   host and `.eliza/client-features` before deletion.
8. **Concurrency risk.** The resident/credential fences in `AlphaLocalAgentPlugin` are intricate; any extraction must be
   validated by the resident instrumentation suites and an emulator HOME-role run, not by host tests alone (AGENTS.md
   evidence classes).
