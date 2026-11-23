# C-android-12: in-file cleanup, chunk android-12

Scope: the 34 files in `chunks/android-12.files.txt` (all still exist). Paths below are relative to
`android/app/src/main/java/ai/alphacompute/alphaphone/` unless they start with `android/` or `test/`.
A5 had already removed the legacy Cloud recovery, `retainedLimit`, `providerAdmissionGeneration`, the
`AlphaBrowserPlugin` re-exports, `LEGACY_PREFIX` and `AlphaDevicePlugin.reconcileUpdate(PluginCall)`.

## Done
- `AlphaActionJournal.java`: named `REMINDER_OPERATIONS` (package, shared with the plugin) and `WORKFLOW_READS`
  sets (C6); one `envelope(entry,result,key)` check replaces seven copies (C3); upstream `ActionJournal.utf8`
  replaces eight `toString().getBytes(UTF_8).length` copies (C3); revision check uses `AlphaUtil.isSha256Hex`
  (B4 J2); dropped "(issue 408)" (A8).
- `AlphaActionJournalPlugin.java`: inlined the `read`/`response` renames (D4); `WorkflowNoticeTapsFactory.delivery`
  replaces the hand-built delivery and anonymous storage (NEW-2, B14); field regexes replaced by upstream
  `ActionJournal.scope`/`ActionJournal.id` (identical patterns, owner's export; B4 J2 equivalent); reminder set from
  `AlphaActionJournal.REMINDER_OPERATIONS`; crash-narration Javadoc cut to one line (A8). Method names and result
  keys unchanged.
- `AlphaCanonicalNotifications.java`: `notificationsAllowed(Context)` replaces the duplicated permission/enabled
  check (C3); `AlphaUtil.isSha256Hex` (J2) and `AlphaUtil.sha256Hex` for the owner hash (J1, replaces
  `HostedResultNotices.hash`, identical output); `attempt` is now `volatile` (NEW-3).
- `AlphaConnectionPlugin.java`: `Slots.CLOUD_PRODUCTION` x3 (J8); `AlphaUtil.noCache` at both connection set-ups
  (J9); deleted the private `RESPONSE_LIMIT`, `required`, `parseJson`, `readBounded` renames, callers use
  `ConnectionTransport.*` (D4); `readCalendarSyncCapabilities` returns directly.
- `AlphaCredentialStore.java`: `NOTES_*` constants are aliases of `Slots.*` (names kept for callers); `slotLimit`
  uses `Slots` names/patterns (J8); all `cloud:production`/`cloud:staging`/`cloud:` literals use `Slots` (J8, C6);
  one `open(Context)` builds the `JsonCredentialSlots` (was written twice); `providerBindingGuard` uses
  `AlphaUtil.sha256Hex`, `removeProviderIfCurrent` uses `AlphaUtil.isSha256Hex` (J1/J2).
- `AlphaDeletionsPlugin.java`: `Task` interface replaced by `Callable<JSONObject>` (C1); four raw
  `execute`/`RejectedExecutionException` blocks use `AlphaUtil.submit` (J4); one `status(String)` helper replaces
  the impossible-`JSONException` wrappers (B4).
- `AlphaDevicePlugin.java` (outside the updater region only): `AlphaUtil.readBounded` for `alpha-source.json` (J3),
  `AlphaUtil.sha256Hex(InputStream)` in `assetSha256` (J1), crash-narration Javadoc cut (A8).
- `AlphaDeviceAppsPlugin.java`: image admission read once. `phone`/`sms` keys kept (wire shape, A5 refuted B19).
- `AlphaDataReset.java`: dropped "issue #409" and the earlier-build narration (A8).
- `AlphaBrowserStores.java`: class comment no longer frames current names as legacy (A8).
- `AlphaAssistActivity.java`: deleted the orphaned Javadoc line (A8). Class kept (D7/R7).
- `android/app/src/launcher/java/.../AlphaTelephonyRoles.java`: one private `COMPONENTS` array instead of
  `DIALER`+`SMS` (0 external users) and the list concatenation; `Log` import (D9/D8). Order and SMS text unchanged.
- `android/app/src/launcher/AndroidManifest.xml`: dropped `(#420)`, `(#421)`, `(#417)` from comments (A8).
- `android/app/src/main/AndroidManifest.xml`: replaced the stale "MVP-DEFERRED" Phone comment (A8). No element changed.

## Deleted tests and formal artefacts
- `test/native-deletion-admission.test.mjs`: source-text (T1); regexes `AlphaDeletionsPlugin` text changed above.
- `test/credential-slot-lock-order.test.mjs`: transplant (T2); slices `AlphaCredentialStore` at the
  `"cloud:production"` literal.
- `test/gmail-background-lock-contention.test.mjs` and its only fixture `test/fixtures/GmailBackgroundLockContentionTest.java`:
  transplant (T2), same slice marker.
- Source-text assertions removed from behavioural files: `test/gmail-background-binding.test.mjs` (3 lines regexing
  the `cloudChange` line), `test/invocation-owner-cache.test.mjs` (3 lines regexing `mutateSlotOnce`).
- Importer fix: `test/power-cold-native-pin.test.mjs` compiles `AlphaUtil.java` and `Slots.java` with the real store.

## Pins left broken
- Quint harnesses compiling real edited sources need `AlphaUtil.java`/`Slots.java` (and for action recovery
  `WorkflowNoticeTapsFactory.java`) in their source lists: `specs/quint/refinement/native/clock-review.mjs`
  (AlphaActionJournal), `clock-review-platform.mjs` (regex for the deleted `private static JSONObject read(`),
  `action-recovery-platform.mjs` (compiles AlphaActionJournal and the plugin slice), `credential-coordinator.mjs`
  and `credential-coordinator-platform.mjs`, `calendar-sync-enable.mjs`, `gmail-background.mjs`,
  `specs/quint/refinement/services/credentials.mjs`, `services/sign-in-coordinator.mjs` (AlphaCredentialStore /
  AlphaConnectionPlugin). Stage E port.
- `specs/quint/native/manifest.json` symbol pins for the deleted private renames in `AlphaActionJournalPlugin` and
  `AlphaConnectionPlugin` (if pinned), not checked here.

## Skipped
- `AlphaCalendarPlugin.java`: all findings. `scripts/ci/calendar-bridge.py` pins the file's SHA-256 (`HOST`) and
  `test/resident-native-ci-admission.test.mjs` asserts it; any byte change breaks the Calendar bridge CI. Foreground
  merge is Q-AND-9 (open).
- `AlphaDevicePlugin` updater region (`hex`, `copyVerified`, `signingRoot`, `UpdatePause.digest`, `UPDATE_BINDING`,
  `automaticUpdateReady` catches, marker comment): transplanted by `test/app-update.test.mjs` and four Quint update
  harnesses; belongs to the stage F `AppUpdater` split. `/intent` mandatory: risky (A5 B7). `shareForeground`
  merges: Q-AND-9.
- J4 `PluginWorkers.submit` -> `AlphaUtil.submit` in AlphaActionJournalPlugin/AlphaConnectionPlugin/AlphaDevicePlugin:
  `test/plugin-worker-guard.test.mjs` asserts every plugin uses `PluginWorkers.submit`; needs one coordinated swap
  with the `PluginWorkers.java` deletion.
- `AlphaCloudSignInPlugin`: `Slots.CLOUD_PREFIX` would break the `test/cloud-deployment.test.mjs` registration
  transplant for one literal; `receiptSlot` and the slot adapter (cross-file `asSlots`) left.
- `AlphaConnectionPlugin`: Workspace/CloudReads moves (stage F); test-only forwards `writeCredentialSlot`/
  `removeCredentialSlot` (androidTest callers); `calendarSyncConsent` inline (regex in calendar-sync-consent test);
  DEBUG diagnostics prefs (instrumentation edits); `SerialStorageTasks` (Q-AND-11).
- `AlphaCanonicalNotifications`: pending-tap predicate dedupe (would break the transplanted `acknowledge` in
  `test/canonical-notification-security.test.mjs`, security compare-and-clear); `ForegroundCheck` -> `AlphaUtil.Guard`
  (rename needs other owners); swallowed-catch logging (B1, specified fallbacks).
- `AlphaApplication`: inlining `resetRecoveryProcess` breaks `test/reset-wiring.test.mjs` regex; not worth deleting
  that test. Static service moves are stage F.
- `AlphaActionJournal`: legacy terminal Clock replay (Q-LEG-7, open); table-driven `listView` rewrite (each block
  restarts from the original result, so a rewrite risks output change); `typed` helper (shapes differ).
- Reminder androidTest accessors (`ReminderTestAccess`, `ReminderLifecycleTestAccess`, `ReminderDeletionJournalFixture`):
  Q-AND-20 (open); merges need edits in importer test classes. `store(c)` twins differ (isolated lookup).
- P-78 (`AlphaAssistActivity`, manifest entries, `takeInvocation`): D7/R7 keep.
- DeviceApps `phone`/`sms`, image admission split: Q-AND-6 / wire contract. Launcher overrides for dormant
  activities: D7. Main manifest voicemail and Contacts comments: meaning not provable, kept. `AlphaSmsRole`
  action strings: installed names. Launcher one-line classes, IME XML, assetlinks template, AlphaContactsPlugin,
  AlphaBrowserPlugin: nothing left to apply.

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 12 edited Java files:
  exit 0 (parse only, not a compile). `xmllint --noout` on both manifests: exit 0.
- `node --test test/power-cold-native-pin.test.mjs test/invocation-owner-cache.test.mjs test/gmail-background-binding.test.mjs`:
  8/8 pass, including the real `AlphaCredentialStore.java` (+AlphaUtil, Slots) executing on the JVM and compiling
  against Android 36 `android.jar`.
- All 65 `test/*.test.mjs` naming an edited file, `--test-concurrency=6`: 369 tests, 364 pass, 1 skipped, 4 fail.
  Rerun alone: `test/app-update.test.mjs` "update flow" fails with `NoSuchFileException .../alpha-update.apk` in
  `UpdateFlowTest`; the updater slice it compiles contains no change of this unit (only A5's `reconcileUpdate`
  deletion differs from HEAD there). `resident-result-transport` and `shared-deletion-window` fail with javac/java
  `ETIMEDOUT` under machine load (other implementers running); not a compile or assertion failure.
  `test/fixtures/google-browser-auth/native-sign-in.test.mjs` fails on a missing fixture path
  (`test/fixtures/src/main/...CloudSignInPlugin.java`), unrelated to these files.
- Not run: Gradle (`android/` has no wrapper; host project is generated), so main/androidTest/launcher source sets
  were not compiled; callers checked with `git grep` (Java, manifests, scripts, test, specs). No APK, emulator,
  image or device run. Quint harnesses not run (pins above are known broken).
