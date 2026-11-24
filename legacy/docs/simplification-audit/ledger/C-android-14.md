# C-android-14: in-file cleanup of chunk android-14

Scope: the 49 files in `chunks/android-14.files.txt` (all still exist; none was deleted by stage A). Every change was
re-checked with `git grep` across `android/`, `apps/`, `scripts/`, `test/` and `specs/` (Java callers, androidTest,
Quint Java traces and harness source lists, string-keyed plugin methods). No plugin name, plugin method, result key,
slot name, wire value, worker class or manifest component changed.

## Done

- `AlphaSmsSendReceiver.java`: dropped the issue number from the class comment (A8).
- `AlphaTelephonyPlugin.java`: dropped the issue numbers from the class comment (A8); `searchContacts` reads the
  `phones`/`emails` arrays once per row instead of on every loop iteration (D8/D9, same output).
- `AlphaSystemPlugin.java`: dropped the issue numbers from the shade comment (A8); `openAppInfo` checks the three
  text fields in one loop instead of a three-call condition (D9, same refusal).
- `AlphaVoiceCloudPlugin.java`: `connectPaired` no longer re-ANDs `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` after the
  line above already threw when it is false (B4, report finding 4).
- `AlphaPhotosPlugin.java`: deleted the `MEDIA_CONFIG` alias of `AlphaMediaConfig.MEDIA`; `mediaConfig()` returns
  `AlphaMediaConfig.MEDIA` (D4). One-line fix in `androidTest/PhotoFilterInstrumentedTest.java` (brief exception b).
- `CalendarSyncConsent.java`, `CalendarSyncFreshness.java`, `GoogleAgentAccessFile.java`: deleted the
  test-shape sentences ("Pure … tested without Android", "kept free of Capacitor so the host JVM test …",
  "Capacitor-free so the host JVM tests can run it") (D7/A8).
- `CalendarSyncFreshness.java`: `requireLocal` is private (no caller outside the file; the fixture calls only
  `readAvailability`).
- `GoogleWorkspaceReturn.java`: one blank line pair trimmed; `opaque` no longer checks `isEmpty()` before
  `trim().isEmpty()` (redundant); new package-private `isNonce` is the single nonce rule, used by `nonce()` and by
  `GoogleWorkspaceReturnFlow.cancel` (C6, report finding 2; same accept/refuse sets).
- `GoogleWorkspaceReturnFlow.java`: `credentialHash` uses `AlphaUtil.sha256Hex` (B4 J1; lower-case hex, byte-identical;
  the `catch(Exception)`→`IllegalArgumentException` wrapper stays because it also covers JSON errors); `cancel` uses
  `GoogleWorkspaceReturn.isNonce`; `MessageDigest`/`StandardCharsets` imports removed.
- `CalendarSyncSnapshot.java`: deleted the local `digest` (B4 J1, `AlphaUtil.sha256Hex`, same bytes); generation check
  uses `AlphaUtil.isOpaque36` (B4 J2, null already refused, same result); the guest e-mail regex is one
  `static final String EMAIL` constant; `MessageDigest` import removed.
- `CalendarSyncMutation.java`: guest e-mail check uses `CalendarSyncSnapshot.EMAIL` (C6, identical regex).
- `CalendarSyncBridge.java`: private inner class `Context` renamed `Lease` (NEW-3/D11; it shadowed
  `android.content.Context`); `digest` delegates to `AlphaUtil.sha256Hex` instead of `HostedResultNotices.hash`
  (NEW-2, B4 J1; identical output), so Calendar code no longer depends on the Hosted notices class; `SLOT` is
  `Slots.NATIVE_CALENDAR_SYNC` and the four `"cloud:production"` reads use `Slots.CLOUD_PRODUCTION` (B4 J8, values
  byte-identical); the operation-id check uses `AlphaUtil.isSha256Hex` (B4 J2; `getString(..,"")` is never null).
- `HostedTransport.java`: deleted the unused `Connections` injection interface and the 4-argument constructor; the one
  constructor opens connections directly (D7, report finding 2; only caller is `HostedDelivery`, no test injected it).
- `HostedNoticePoster.java`: deleted the two test-only `result(...)` overloads ("Visible for builder tests") and the
  unused imports `android.provider.Settings`, `com.getcapacitor.*`, `com.getcapacitor.annotation.*`,
  `java.util.concurrent.*`, `org.json.JSONObject` (D7, A7). The androidTest builder test now calls the 4-argument form.
- `HostedResultNotices.java`: deleted the test-only 1-argument `capture(String)`; callers use `capture(key,false)`.
- `HostedInbox.java`: `acceptsReconciledReplacement` is private (only in-file callers); the trailing comment no longer
  says "legacy/previous" and states the rule (A8).

Caller and harness fixes made with these changes (brief exception b, one line each):
- `android/app/src/androidTest/.../HostedResultNoticeInstrumentedTest.java` (`result(tap,redacted,null,false)`),
  `PhotoFilterInstrumentedTest.java` (`AlphaMediaConfig.MEDIA`).
- `test/fixtures/HostedResultNoticesTest.java`, `test/fixtures/HostedNoticeWithdrawTest.java`,
  `specs/quint/refinement/native/HostedResultNoticeTraces.java`: `capture(x)` → `capture(x,false)`.
- `AlphaUtil.java` (and `Slots.java` where used) added to the javac source lists that compile the migrated files:
  `test/google-workspace-return-flow.test.mjs` (2 javac calls), `test/workspace-return-fallback.test.mjs`,
  `specs/quint/refinement/native/credential-coordinator.mjs` (`credentialCoordinatorSources`),
  `test/calendar-sync-mutation.test.mjs`, `test/fixtures/calendar-sync-snapshot-jvm.mjs`,
  `specs/quint/refinement/native/calendar-sync-enable.mjs` (`AlphaUtil`, `Slots`).

## Deleted tests and formal artefacts

- None deleted. One source-text assertion removed from `test/context-selection.test.mjs` (the regex on
  `return MEDIA_CONFIG;`); the rest of that file is behavioural and still passes.

## Pins left broken

- None known from this unit's changes.
- Not caused by this unit, seen while verifying: `specs/quint/refinement/native/credential-coordinator.mjs` currently
  fails to compile because `AlphaConnectionPlugin.java` and `AlphaCredentialStore.java` (other implementers, in
  progress) now use `Slots`, which that source list does not yet include. Their owner must add `Slots.java` there. No
  error was reported in a file of this chunk.

## Skipped

- **Open questions / decisions:** P-78 entry removal (`AlphaPowerVoiceActivity`, `AlphaQuickSettingsTile`,
  `AlphaSystemPlugin.isAssistantLaunch`, DailyApps assistant hooks): not done (D7, R7, G8). Hosted/paired removal
  (`HostedTransport`, non-resident `HostedDelivery` modes, paired speech in `AlphaVoiceCloudPlugin`, `CloudSpeechPolicy`
  pairing clause): stage A4 scope (D5, cross-file with renderer, Quint and tests); no A4 ledger exists, left as is.
  `CalendarDeletionIdentity.legacy` rename/delete (Q-LEG-4 Open). `AlphaPhotosPlugin.preserveClosedVideoCopy`
  (Q-AND-12). `DailyApps` `https://example.com` fallback (Q-UI-20). Test hooks `instrumentationBaseUrl`,
  `instrumentationCredentialSlot`, `IsolatedPdfService.stallFixture` (Q-AND-7). LateLaunch/closedMessage boilerplate
  (Q-AND-14). `AlphaTelephony` plaintext journal source (upstream, D14).
- **Needs a file move, merge or split (stage F):** `AlphaVoiceCloudPlugin` split (Notes methods, `Streaming`, 429
  parser into `CloudVoiceLimit`); `CalendarSyncBridge` journal split; `CalendarZones`→`AlphaCalendarPlugin`,
  `HostedDeliveryCancelled`→`HostedDelivery`, `HostedStorageFault`→`HostedInbox`; `CalendarCreationStore` delete
  (edits `AlphaCalendarPlugin`, not owned); `AlphaUpdateStatusReceiver` move; `ConnectionRoutes` forward removal
  (edits `AlphaConnectionPlugin`, not owned; and `calendarSync` is called there, the report's "0 hits" is wrong).
- **Needs a shared module that does not exist (B4 skipped it):** `AlphaCredentialStore.asSlots()` slot adapters in
  `AlphaReminders`, `AlphaTelephony`, `AlphaNotificationsPlugin`, `HostedDelivery`, `GmailBackground`;
  `OwnerSurface`/`CalendarPermissions` (`CalendarScopedDeletionReview`, `CalendarSyncBridge`, `ClockAgentReview`);
  `Json.wholeNumber` (`ClockAgentReview`, `DailyAppsPlugin`, `CalendarAvailabilityJournalResult`); `Workers`
  scheduling (`GmailDeliveryWorker`, `HostedDeliveryWorker`, B4 found them not identical); shared status/dispatch
  helpers; Photo permission alias constants (owner of `AlphaMediaConfig`).
- **B4 rows not applied:**
  - `HostedResultNotices.hash` delete: still called by ~10 classes in other chunks and by
    `HostedResultNoticeTraces.java`; delete once those migrate. The Hosted-family regex/prefix/Guard rows
    (`HostedResultNotices` J2, `HostedInbox.id`/`Fence`, `HostedDelivery` J2/J8, `HostedTransport.Guard`/`noCache`)
    were left: they would add `AlphaUtil` to about twelve Quint and javac source lists
    (hosted-inbox, hosted-result-notices, deletion-coordinator, resident-coordinator, native-digest-platform,
    resident-result-transport, native-deletion-review-fence, native-digest-sources, source-renewal-notices,
    hosted-notice-withdraw, `scripts/test-android-notification-device-slot.ts`) for constant swaps.
  - `GmailBackground` J8 (`SLOT`, `"cloud:production"`): `test/gmail-background-binding.test.mjs` regexes both literals.
  - `AlphaTelephony` J8 (`SMS_SEND_LEDGER`): `test/aosp-sms.test.mjs` asserts the literal in the file.
  - `AlphaVoiceCloudPlugin` J3/J9/J8/J2 (`readBounded`, `noCache`, `CLOUD_PREFIX`, `LOCAL_AGENT_PROVIDER`, `isUuid`) and
    report findings 8–10 (`PROVIDER_SLOT`, busy-refusal and empty-window helpers): the file is transplanted by
    `cloud-voice-profile`, `native-voice-listener-rules`, `notes-recorder` and others (exact busy-line text, stub
    `AlphaCredentialStore` that asserts the literal slot); left for the stage F split.
  - `GoogleWorkspaceReturn.java:67` `isOperationId`: one regex, six harness lists; not worth it alone.
  - `CalendarSyncBridge.java:115` `isUuid`: B4 marks it a behaviour change (different exception type); kept.
- **Pinned by a source-text test whose ordering assertion is still useful:** `CalendarSyncBridge` `SETTLED_PHASES`
  constant and `CalendarSyncReceiptRecovery.MAX_RECEIPTS` (`test/calendar-sync-receipt-recovery.test.mjs` slices the
  exact `>=128` and `Set.of(...)` text); `AlphaPhotosPlugin.qaMarker` inline (`test/photos-debug-diagnostics.test.mjs`
  transplants it). Left for stage E.
- **Low value / formatting only (D8, no formatter in this stage):** FQ-name imports (`AlphaNotificationsPlugin`,
  `DailyAppsPlugin`, `CalendarSyncSnapshot`, `CalendarSyncReceiptRecovery`), `HostedNoticePoster` intent/redacted
  helpers, `HostedDelivery.checkRun` ternary, `ClockAgentReview` exception messages, `CloudVoiceLimit` catch
  narrowing (would change which runtime failures are ignored), `HostedResultNotices.Poster` single-method interface
  (touches five test fixtures and a Quint stub), `renewalTag`/`renewalWork` merge (a WorkManager unique name and a
  notification tag that happen to share a string).
- `CloudDeployment.java`: generated by `scripts/cloud-deployment.ts`; not edited.

## Verification

- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 17 edited main files, the
  two androidTest files, `HostedResultNoticeTraces.java` and the two test fixtures: exit 0 (parse check only).
- Host tests (`node --test`, 25 files: calendar-sync-snapshot, hosted-result-notices, hosted-notice-withdraw,
  native-deletion-review-fence, native-digest-sources, source-renewal-notices, resident-result-transport,
  native-plugin-teardown, cloud-voice-profile, native-voice-listener-rules, aosp-image-capability, aosp-sms,
  context-selection, photos-debug-diagnostics, calendar-sync-receipt-recovery, calendar-sync-cloud-refusal,
  calendar-availability-reader, calendar-sync-consent, google-workspace-return-native, google-workspace-return-flow,
  workspace-return-fallback, calendar-sync-mutation, gmail-background-binding, system-shade, aosp-telephony):
  103 tests, 97 pass, 1 skipped, 5 failed with `spawnSync javac ETIMEDOUT` (machine load average ~150). Rerun alone:
  hosted-notice-withdraw 1/1, hosted-result-notices 1/1, resident-result-transport 2/2, native-digest-sources 2/2
  (one later rerun timed out again in javac); native-deletion-review-fence was not rerun alone.
- Quint refinement drivers run with node: `calendar-sync-enable.mjs` (real `CalendarSyncBridge`, `CalendarSyncSnapshot`,
  `CalendarSyncMutation` with `AlphaUtil`/`Slots`): `{"traces":9,"checkpoints":80,"fields":18,"passed":true}`.
  `checkNativeHostedResultNotices` and `checkNativeHostedInbox`: Java trace generation completed (compiles
  `HostedResultNotices`, `HostedInbox`, `HostedTransport`, `HostedResultNoticeTraces`); the Quint CLI step then timed
  out (`ETIMEDOUT`, load), so neither is proven green here. `generateCredentialCoordinatorTraces('oversize')`: javac
  fails only in `AlphaConnectionPlugin.java`/`AlphaCredentialStore.java` (missing `Slots` on that list, other
  implementers' in-progress change); no error in a file of this chunk.
- `AlphaSystemPlugin.java` compiled (javac, JDK 21) with the app-info-handoff harness ports
  (`withAppInfoSource`): ok.
- **Not run:** `./gradlew … compileDebugJavaWithJavac` (no Gradle project in this tree), the Android build, any
  emulator, instrumentation, AOSP image or device run, `npm run verify`. The androidTest edits were checked by parse
  and by reading the called signatures only.
