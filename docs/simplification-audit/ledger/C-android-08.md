# C-android-08: androidTest Notes*, Notification*, Paired*, Password*, PdfViewer, Photo*/Photos*

Stage C in-file cleanup of the 27 files in `chunks/android-08.files.txt`. `PhotosFixtureRecoveryInstrumentedTest`
was already deleted by A5. No shared module (B1-B4) or types/helpers row names these files, and the shared WebView,
Photos and digest helpers the reports propose (`WebViewTestDriver.until/click/setValue/call`, `PhotosTestFixture.insert`,
`TestDigests`, `SettingsSwitch`, `SyntheticNotice`) do not exist and live in files other units own, so the
helper-consolidation findings were not applied (see Skipped).

## Done
- `PairedMapsInstrumentedTest.java`, `PairedReminderInstrumentedTest.java`: deleted (never run, inputs
  `paired-maps-fixture.json` / `paired-reminder-fixture.json` written by nothing; D5, T9). Their two
  `NOT_RUN_BY_A_RUNNER` rows removed from `scripts/android-instrumentation.ts` in the same change (brief: registry
  update with the deletion). Grep: no other reference in android/, scripts/, test/, specs/.
- `NotesSecureStorageInstrumentedTest.java`: deleted `freshInstallLegacyMigrationRetainsExactArchiveAndAudio` (gate
  `notesSecureMigration` passed by nothing; legacy migration, D1/T9); replaced the private `saved()` bridge read with
  `NotesSecureFixture.raw()` (same slot, same `secureRead`; C3); one private `openNotes()` for the 5 repeated
  liveMode/navigate/wait/committed sequences (C3); restart-phase comment no longer says "the same" (it referred to the
  deleted method).
- `NotesStorageDurabilityInstrumentedTest.java`: `slot()` returns the bridge result directly (temp variable removed);
  history comment ("The old 33 MiB textarea…") replaced by a statement of why the edit is small (A8).
- `NotesTrashBackstopInstrumentedTest.java`: deleted `notes(String...)`; its callers use `savedNotes("backstop", …)`
  (identical envelope; only the unasserted voice-note title differs, and the sweep never reads titles) (C3); one
  private `METADATA` constant for the 11 `"note-audio-metadata:v1:"` literals (C6; production has no exported constant
  and `AlphaNoteAudioPlugin` is not mine).
- `NotificationsInstrumentedTest.java`: private `home()` for the three identical Home navigate+wait sequences (C3);
  fully qualified `android.app.NotificationManager`/`Notification`/`ReminderTestAccess` replaced by the existing
  imports (D8); issue number removed from the class comment.
- `NotificationChannelsInstrumentedTest.java`: issue number removed from a comment; fully qualified
  `AccessibilityNodeInfo` uses the import.
- `PairedAsrInstrumentedTest.java`: deleted the unused `requestId` header parse and inlined the single-valued
  `status`/`type` locals in the loopback fixture (A7).
- `PasswordBrowserFillInstrumentedTest.java`: local `Match` / `DocumentPoint` interfaces replaced by
  `java.util.function.Predicate<AccessibilityNodeInfo>` / `java.util.concurrent.Callable<double[]>` (C1).
- `PasswordFillFixtureActivity.java`: `sha()` no longer swallows a missing SHA-256 into the string "unavailable"
  (which would make expected and observed status match silently); `NoSuchAlgorithmException` becomes an
  `AssertionError` (B1).
- `PasswordVaultFixture.java`: `credentialPromptShown`/`credentialPromptGone` share one `credentialPrompt(shown,
  timeout)` poll (public `credentialPromptShown` kept, pinned by the runner test) (C3); `logcatSince` comment corrected
  (the command reads all processes, not the app process only).
- `PdfViewerInstrumentedTest.java`: removed the `AccessibilityNodeInfo.obtain`/`recycle` ceremony (no-ops since API 33;
  on minSdk 29-32 unrecycled nodes are only garbage-collected) and the try/finally blocks that existed only for it.
- `PhotoLibraryInstrumentedTest.java`: `Math.min(24, ids.size())` → `24` (size asserted to be 60 two lines above; B4).
- `PhotosBatchInstrumentedTest.java`: deleted the unused `android.view.*` import (A7); private `openPhotos()` for the
  three repeated Photos navigation sequences (C3).

## Deleted tests and formal artefacts
- `android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedMapsInstrumentedTest.java`: never-run class
  (paired host, D5).
- `android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedReminderInstrumentedTest.java`: never-run class
  (paired host, D5).
- Method `NotesSecureStorageInstrumentedTest.freshInstallLegacyMigrationRetainsExactArchiveAndAudio`: never-run
  legacy migration (D1).
- No Quint/Lemma artefact references these files (grep: 0).

## Pins left broken
- `NotesSecureStorageInstrumentedTest.secureMigrationProcessRestartPhase` tests the legacy localStorage Notes
  migration whose renderer reader is already deleted (`apps/app/src/runtime/notes-store.ts` no longer contains
  `alphaphone:prototype:notes:v1`/`alphaphone:notes:v2`), so its `verify` phase cannot pass on a device any more. It
  is kept because removing it needs, in the same change: the `notes-secure-migration` entry in
  `scripts/test-native-restart.ts`, the row at `test/android-instrumentation-runner.test.mjs` ("restart runner wires
  the migration…"), `test/native-restart-runner.test.mjs` (`notes-secure-migration` kind and gate) and
  `test/fixtures/isolated-native-campaign.mjs` (kind, class, method and gate lists), plus the registry note on
  `NotesSecureStorage` in `scripts/android-instrumentation.ts`. All owned by other units; stage E should delete the
  method and those rows together (D1).

## Skipped
- **Paired speech classes** (`PairedAsr`, `PairedVoice`, `PairedAsrLive`, `PairedVoiceLive`): registered/campaigned
  tests of production paired methods that still exist (`AlphaVoiceCloudPlugin` paired methods,
  `scripts/android-paired-speech-live.ts`); deletion belongs to the cross-file U-R5 Android half (D5), not this
  in-file unit. Q-HOST-6 (replacement speech path) is Open.
- **Open questions:** `PhotoEdit.grantedLibrarySaveOpensTheCopyAndConfirms` (Q-AND-21); `PhotosForeignLibrary`
  delete-or-wire (Q-AND-26); PasswordBrowserFill live `example.com/.org` network (Q-AND-37); upstream engine tests
  PhotoReplace/PhotoFilter/PhotosCatalogOrder/PhotosLibrary (D14/R6).
- **Shared helpers that do not exist and live in other owners' files:** `WebViewTestDriver.until/click/setValue/
  call/nativeCall`, `NotesSecureFixture.compareExchange`, `TestDigests.sha256Hex`, `PhotosTestFixture.insert/revision/
  hash`, `SettingsSwitch`, `SyntheticNotice`, `A11yTree`, `DeviceShell`, `BrowserChildDriver` (extracting
  `child`/`diagnostics` from `BrowserFlowInstrumentedTest`), production constants for `alpha-photo-edit-results`,
  `alpha-owned-media-versions`, `note-audio-metadata:v1:` (owners `AlphaMediaConfig`, `AlphaPhotosPlugin`,
  `AlphaNoteAudioPlugin`).
- **Wrong finding:** PhotosForeignLibrary `!"\"null\"".equals(encoded)` check: `WebViewTestDriver.evaluate` returns
  the JSON encoding of the script result, so `JSON.stringify(null)` arrives as `"\"null\""`; the quoted form is the
  live case. Kept.
- **Behaviour changes in tests, not taken without a run:** NotificationChannels `back()` → `WebViewTestDriver.pressBack()`
  (different key-event source/flags); Notifications plugin-presence poll removal; PasswordVaultSettings back buttons via
  `press()` (would add assertions and a different selector); `assertTrue(eval(...))` → `until` there; NotesTrashBackstop
  `recording`/`liveRecording` merge (different `createdAt` and fields; a nullable-arg helper is not simpler).
- **Not applicable:** `SDK_INT>=30` asserts/assumptions (minSdk is 29, so they are not guaranteed);
  NotificationAccessTestDriver (every member is used by the two CrossAppNotifications classes); PasswordVaultFill and
  PhotosCatalogOrder (text-pinned by the runner test); PasswordVaultFixture `Until` import (A5 already removed it);
  NotesStorageDurability `retainedLimit` test (A5 already removed it); formatter-only findings (D8/D9, no formatter in
  this stage).

## Verification
- `javac -XDshould-stop.ifError=PARSE -XDshould-stop.ifNoError=PARSE -proc:none` over the 12 edited Java files: exit 0.
  This is a **parse check only**; the androidTest source set was not compiled (no Gradle project in `android/`; the
  host project is generated by the build pipeline). Callers checked by `git grep` across android/, scripts/, test/,
  specs/ for every changed or removed member (`notes`, `saved`, `credentialPromptGone`, `Match`, `DocumentPoint`,
  `PairedMaps`, `PairedReminder`, fixture JSON names); all changed members are private except
  `credentialPromptShown` (signature unchanged).
- `node --test test/android-instrumentation-runner.test.mjs test/gesture-zones-single-instance.test.mjs`: 29 tests,
  29 pass, 0 fail.
- Not run: Gradle compile, APK build, emulator, instrumentation, AOSP image, device.
