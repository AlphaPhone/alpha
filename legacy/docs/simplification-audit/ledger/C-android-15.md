# C-android-15: in-file cleanup, Android main source K… to W…

Scope: the 49 files in `chunks/android-15.files.txt`. `LegacyCloudRecovery.java` was already deleted by A5 and is
skipped. Every change below was re-found by content and every changed member was re-grepped across `android/`
(main, androidTest, manifest), `apps/`, `scripts/`, `test/` and `specs/`, including string-keyed and text-pinned uses.

## Done

- `KeyboardDictationCloud.java`: imports `PasswordSurfaces` and uses one private `requireActive()` for the duplicated
  cancel/password-surface check (C5, D8); slot literals use `Slots.LOCAL_AGENT_PROVIDER` (x2) and
  `Slots.CLOUD_PRODUCTION` (B4 J8, C6); the connection setup uses `AlphaUtil.noCache(request,20000,60000)` (B4 J9).
  The bounded response read stays local (B4 J3 says keep: it checks the cancel flag per chunk).
- `KeyboardDictationPolicy.java`: the input-type magic numbers are named private constants with the Android names
  and the same values (D7 variant, D8). The class stays Android-free.
- `MainActivity.java`: removed comment history only (the "Derived from …main-activity.ts" header line and the
  "round 7 / round 8" measurement parentheticals in the one-live-instance comment) (A8). No code line changed.
- `NativeDigestHost.java`: deleted the unreachable `if(!"read".equals(request.getString("action")))throw …` after
  the `describe` return: `action` is already restricted to `read`/`describe` at entry, and `describe` has returned
  (B4 "impossible-state guard"; not a security check, it can never run). Both binding loops use
  `NativeDigestSources.BINDING_FIELDS` (C5).
- `NativeDigestSources.java`: new package-private `BINDING_FIELDS` (one list for the three binding loops), an
  `id(String)` overload replaces building a throwaway `JSONObject` to validate `sourceId` (D8 finding 8), and the
  stacked Javadoc was moved onto `MAXIMUM_EXPIRY_MS` where it belongs (A8).
- `NativeNotificationDiagnostics.java`: the duplicated exception-family expression is one private `family()` (C3,
  B4 J10). Log strings unchanged.
- `NativeNotificationSession.java`: the cursor-field set is a `private static final` constant instead of being
  rebuilt for every key (C6).
- `NativeOwnerReminderHost.java`: the duplicated native-local `accountRef` derivation is one private
  `accountRef(provider,subject)` (C5); the nested-ternary field loop is two parallel arrays (D9). Messages and output
  JSON unchanged.
- `NoteSourceReferences.java`: dropped "(J03, option a)" review reference (A8).
- `NotesDeletionLease.java`: dropped "No Android types: host-tested by javac." and the "written before leases" history;
  the no-lease rule is kept (A8, D7).
- `OwnerRoutes.java`: `ASSET` is now private (only this file reads it) (A7).
- `PasswordProviderSupport.java`: the publisher certificate is decoded once into a private constant instead of on every
  `trusted()` call (finding 1).
- `PluginWorkers.java`: dropped "(AlphaDevicePlugin, round 8, a326b8dd)" and "host-tested by javac" (A8).
- `PreparedViewNavigation.java`: the catch is narrowed from `Exception` to `JSONException`, the only exception the
  `try` body can throw (B1).
- `RendererRecoveryBudget.java`: dropped "No Android types: host-tested by javac." (A8).
- `ResetRecoveryActivity.java`: dropped "(issue #409)" (A8).
- `ResidentResultSession.java`: one private `bearer(token)` check replaces the two inline copies (C3, same 8192 bound
  and messages); `credential()` hashes the read slot once instead of up to three times (D9); passes `System::nanoTime`
  to the one remaining `ResidentResultTransport` constructor.
- `ResidentResultTransport.java`: deleted the 4-argument constructor; the clock-taking constructor is the only one
  (D7: production and the host fixture now use the same constructor).
- `ResidentScheduleRearm.java`, `ResidentScheduleReceiver.java`: dropped "(#394)" and "was not exercised by this
  policy's tests" (A8).
- `SelectedDocumentAccess.java`: `PREFERENCES` and `PREVIEW_PREFIX` are private (no reader outside the file) (A7).
- `SmsActionJournalResult.java`: the status sets are `private static final` constants (`SUCCEEDED`, `REFUSED`,
  `OUTCOMES`, `PART_STATES`) instead of `Set.of` rebuilt per check and per part (C6). Acceptance rules identical.
- `SourceRenewalNotices.java`: private `drop(rows,key)` (remove, save, cancel) replaces 5 copies and private
  `keys(rows)` replaces 5 copies of the key-snapshot loop (C5). Row format and call order unchanged.
- `WorkflowWorkerAssets.java`: local `hex`/`digest` deleted, uses `AlphaUtil.hex`/`AlphaUtil.sha256()`; `bounded` is
  `AlphaUtil.readBounded(input,MAX_INDEX,"Worker index too large")` (same limit, message and zero-read handling);
  the index hash check uses `AlphaUtil.isSha256Hex` (B4 J1/J2/J3); the duplicate `PACKAGE_STAMP` comment removed
  (A8). The copy/verify loops stay local as the migration map says.
- Harness compile lists (B4 map: "every harness that compiles a migrated file must add AlphaUtil.java"), one entry
  each, no other change:
  - `test/keyboard-dictation.test.mjs` (both javac lists): `AlphaUtil.java`, `Slots.java`.
  - `specs/quint/refinement/native/keyboard-dictation-cloud.mjs` (`compiled`): `AlphaUtil.java`, `Slots.java`.
  - `test/workflow-worker-assets.test.mjs`: `AlphaUtil.java`.

## Deleted tests and formal artefacts

None.

## Pins left broken

- None known. All javac host tests that compile an edited file were run and pass (see Verification). The Quint
  harnesses that compile edited files keep compiling; the ones whose output was compared produce the same traces as
  HEAD (see Verification).
- Coordination note: `AlphaKeyboardDictationService.java` (another chunk) is compiled by the first list in
  `test/keyboard-dictation.test.mjs`; if its owner also adds `AlphaUtil.java` there, keep a single entry.

## Skipped

- **`HostedResultNotices.hash` → `AlphaUtil.sha256Hex` (B4 J1)** in `NativeDeviceEnrollmentKey`,
  `NativeOwnerReminderHost`, `NativeNotificationSession`, `ResidentResultSession`, `NativeDigestSources`,
  `SourceRenewalNotices`; and the identifier checks of B4 J2 in the same files (`NativeOwnerReminderHost:84`,
  `ResidentResultSession` device check, `NativeDigestSources` revision check, `NativeNotificationSession` epoch UUID).
  Identical behaviour, but each file is compiled by explicit source lists in about 15 harnesses
  (`scripts/test-android-notification-device-slot.ts`, `test/native-notification-device-slot`, `native-deletion-review-fence`,
  `resident-result-transport` (x2), `native-notification-session`, `notification-persist-owner-branches`,
  `native-digest-sources`, `source-renewal-notices`, `resident-android-json-compile` (which stubs
  `HostedResultNotices.hash` itself), Quint `deletion-coordinator.mjs`, `hosted-inbox.mjs`, `native-digest-platform.mjs`,
  `source-renewal.mjs`, `resident-coordinator.mjs`). The `HostedResultNotices` owner edits several of the same lists for
  its own migration; doing it once in stage E (T10 harness port) avoids conflicting list edits. `HostedResultNotices.hash`
  therefore still has importers here and must not be deleted yet.
- **`NativeNotificationDiagnostics` → `AlphaUtil.httpStatus` (J10)**: same reason (5 harness lists).
- **`RendererCredentialSlots` → `Slots`/`AlphaUtil.SHA256_HEX` (J8/J2)**, **`LocalAgentProviderAdmission.PROVIDER_SLOT=
  Slots.LOCAL_AGENT_PROVIDER`**, **`NativeDeletionCoordinator.JOURNAL=Slots.NATIVE_DELETE_JOURNAL`**: values already
  identical; each would add `Slots.java`+`AlphaUtil.java` to 4-16 harness lists (7 host tests for
  `RendererCredentialSlots`; many stubs for `LocalAgentProviderAdmission`). Left for the harness port.
- **Guard interfaces → `AlphaUtil.Guard` (J7)**: `NativeDigestSources.Guard` is used by `HostedDelivery` (other chunk)
  and `native-digest-platform.mjs`; `ResidentResultSession.Guard` and `ResidentCredentialShutdownRetry.Guard` are named
  by `test/fixtures/ResidentResultTransportTest.java` and `ResidentCredentialShutdownRetryTest.java`. Same for
  `ResidentCredentialShutdownRetry` `Probe`/`Clock`/`Pause` → JDK types (Q-AND-24 needs the harness rewrite).
- **`PluginWorkers` → `AlphaUtil.submit` (J4)**: 45 call sites are in other chunks; the file stays until no importer remains.
- **Open owner questions**: `ResidentOwner` owner-session / running-agent unification and the placeholder-agent and
  `expiresAt` rules (Q-AND-23, security); `NativeDeletionCoordinator` unversioned Calendar target fallback and
  `NativeDigestSources` `legacyAlarm`/`at` fallback (Q-LEG-4); `MainActivity.isAssistantSurface` and its conjuncts
  (P-78, R7/D7); `MainActivity` `AlphaContactsPlugin` registration (Q-AND-22); `LateLaunch`/`PluginWorkers`/
  `SerialStorageTasks` base-plugin fold (Q-AND-14, Q-AND-11).
- **Hosted/paired (C4/D5, no A4 ledger)**: `PairedAgentCredential.java`, `PairedSpeechContract.java`,
  `NativeDeviceEnrollmentKey.cloud`: left for the C4 unit, as A5 did.
- **File merges and moves (stage F)**: `VoiceEventAdmission` → `NativeVoiceBinding`, `NavigationOpenRequest` →
  `MainActivity`, `SourceRenewalHost` → `SourceRenewalNotices`, `WorkflowNoticeTapsFactory` → `WorkflowNoticeTaps`/
  `WorkflowNoticeDelivery`, the `MainActivity` split, `RendererRecoveryBudget` HOME helpers → `HomeSettings`,
  `UpdateConfirmationReceipt` → `update/`, `ResidentCredentialShutdownRetry`/`ResidentRecoveryReview` →
  `ResidentLifecycle`, `NativeOwnerReminderHost.deviceSlot` → `NativeDeviceEnrollmentKey` (pinned by
  `test/native-notification-device-slot.test.mjs` and the device-slot script).
- **`NativeReadEpoch.java` delete**: still compiled by Quint `ComponentTraces.java` (MediaLifecycle), as A5 recorded;
  needs the harness port (D11).
- **Test-only members kept because other-owned tests or Quint traces call them (D7)**:
  `WorkflowNoticeDelivery.approvalTimeout`/`publishApproval`/`withdrawApproval(id,now)`/`expireApprovals` and the
  empty `Storage`/`Poster` aliases (`test/fixtures/Workflow*Test.java`, Quint `WorkflowNoticeTraces.java`,
  `AlphaActionJournalPlugin`, androidTest); `OwnerRoutes.Assets` and the `OwnerRoutes` wrapper
  (`test/owner-route-parity.test.mjs`, `AlphaConnectionPlugin`, `AlphaLocalAgentPlugin`); `NativeDigestSources`
  7-argument `read` and 3-argument constructor (fixture, androidTest); `RendererCredentialSlots` forwards and
  `nativeNamespaces()` (7 host tests, `AlphaConnectionPlugin`, `ConnectionInstrumentedTest`);
  `SelectedDocumentAccess.initialize`/`read`/forwards (`DailyAppsPlugin`, `AlphaFilesPlugin`, androidTest);
  `NotificationAccess` remaining forwards (androidTest, application manifest pins `pause`);
  `NativeOwnerReminderHost.Ports` constructor (host tests, Quint); `ResidentScheduleRearm.admitAndStart` (Quint
  traces and `test/digest-missed-run-now.test.mjs` regex on `AlphaLocalAgentPlugin`); `RendererRecoveryBudget.settingsAction`
  (Quint native manifest symbol); Android constants re-declared in `RendererRecoveryBudget`/`ResidentScheduleRearm`
  (javac tests, D7).
- **Changes with a visible or behavioural effect, not made**: `SmsActionJournalResult` per-rule exception messages
  (new text); `NativeDeletionCoordinator` narrowing `catch(Exception)` around `BOOT_COUNT` to
  `SettingNotFoundException` (other runtime failures would start throwing); `UpdateConfirmationReceipt.decode` catch
  narrowing (`systemTarget` can throw runtime exceptions that must stay "no receipt"); `WorkflowWorkerAssets` zero-read
  branches (B4 map keeps them) and required `packageStamp` (needs `AlphaLocalAgentPlugin`, other chunk);
  `WorkflowWorkerAssets.configureEnvironment` move (slices in `test/product-character-host.test.mjs`).
- **Text-pinned code not reformatted**: `MainActivity` page/dispatch helpers (finding 6/7/8: exact strings matched by
  `main-activity-platform.mjs`, `quint-back-dispatch` and `gesture-zones-single-instance`), `SourceRenewalHost`,
  `WorkflowNoticeTapsFactory`, `NativeDigestHost` long lines (no reformat in this stage, D9).
- **KEEP verdicts with nothing to change**: `LateLaunch`, `LocalAgentProviderAdmission`, `NoteSourceReferences` (comment
  only), `ReminderReceiver`, `ResetBeforeDispatch` (A5 already removed the legacy step), `ResidentRecoveryReview`,
  `ReviewedCopies`, `SerialStorageTasks`, `WorkflowNoticePoster`, `WorkflowNoticeTaps`.

## Verification

- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 24 edited Java files: exit 0.
  This is a parse check only.
- Host tests, `node --test --test-concurrency=4` over 23 files that compile or read the edited sources
  (`keyboard-dictation`, `workflow-worker-assets`, `native-digest-sources`, `native-notification-diagnostics`,
  `native-notification-session`, `notification-persist-owner-branches`, `native-deletion-review-fence`,
  `native-notification-device-slot`, `resident-result-transport`, `resident-android-json-compile`,
  `source-renewal-notices`, `sms-action-journal`, `prepared-navigation-route`, `owner-route-parity`,
  `digest-missed-run-now`, `renderer-recovery-budget`, `plugin-worker-guard`, `reset-startup`, `reset-wiring`,
  `product-character-host`, `gesture-zones-single-instance`, `aosp-image-capability`, `login-surfaces`): 74 tests,
  74 pass, 0 skipped. These compile the real edited classes (several against `android-36/android.jar`).
- Quint: `test/quint-keyboard-dictation-cloud.test.mjs` pass; `test/quint-source-renewal-question.test.mjs` 3/3 pass.
  `test/quint-native-digest-consent.test.mjs` fails twice with `Quint checker failed in NativeDigestConsent batch 0
  (spawnSync … ETIMEDOUT)` (machine load average about 160 from parallel implementers). The Java side was checked
  separately: the 18 `NativeDigestTraces` scenarios generated from the edited `NativeDigestHost`/`NativeDigestSources`
  and from HEAD's versions are deep-equal, so the timeout is not caused by this change; rerun on an idle machine or CI.
- Quint deletion coordinator (Java side only, `DeletionCoordinatorTraces` over all 23 scenarios, edited
  `NativeOwnerReminderHost`/`NativeNotificationDiagnostics` versus HEAD's, UUIDs and wall-clock millis normalised):
  22 scenarios identical. `reminder-session-retired` differs only in a `reviewFence` digest, and it differs the same
  way when the edited sources are compared with themselves (the digest covers a wall-clock-dependent session), so it is
  run-to-run noise, not a change. The Quint checker itself was not run for this model.
- Not run: Gradle compile (`android/` has no Gradle project until the build pipeline generates it), APK build,
  emulator, instrumentation, AOSP image or device. Quint `hosted-inbox`, `resident-coordinator`, `settings-handoff` and
  the renderer-recovery family were not run (they compile edited files whose changes are internal: hashing once,
  constructor reuse, cached certificate bytes, comments).
