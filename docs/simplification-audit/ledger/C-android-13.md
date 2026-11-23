# C-android-13 ledger (stage C, in-file cleanup)

Files: `android/app/src/main/java/ai/alphacompute/alphaphone/` Alpha{Files,Gmail,HostedResults,ImageCapabilities,
ImageCapability,KeyboardDictationService,LocalAgent,MailAttachments,MailFileProvider,MailPdfActivity,MapsTransport,
MediaConfig,NavigationService,NoteAudio,NoteDocuments}Plugin/… and `AlphaNoteRecorder.java`. `AlphaListenerPlugin.java`
was already deleted by A5. Line numbers below are pre-change.

## Done
- `AlphaMailFileProvider.java`: one `FOLDER="mail-attachments"` constant (value unchanged) used by the provider's two
  checks (C6).
- `AlphaMailAttachmentsPlugin.java`: `handoff()` and `copyFolder()` use `AlphaMailFileProvider.FOLDER` (C6); deleted the
  one-line forwards `hash`, `validateOpaque`, `opaqueMime`, `read` and call `DocumentBytes.*` directly (D4; `validate`
  stays, androidTest `MailAttachmentInstrumentedTest` calls it); inlined the private `revoke`/`cleanup` forwards to
  `copies.revoke`/`copies.clear` (comment moved to the `copies` field); `saveResult` replaced by the identical upstream
  `DocumentFolderTree.result` (C3).
- `AlphaNoteDocumentsPlugin.java`: `result` delegates to the identical `DocumentFolderTree.result` (C3); `write` drops
  its two parameters that always carried the same copy (copy unchanged) (D4).
- `AlphaFilesPlugin.java`: `accessState()` for the two identical status/access answers (C3); dropped the stale
  `// ---- Storage browser ----` banner; the watch-refusal comment that sat between `return` and the refusal lambda moved
  into the `storageWatch` Javadoc (A8/D8).
- `AlphaHostedResultsPlugin.java`: `java.util.concurrent.*` already imported, so `CountDownLatch`, `TimeUnit`,
  `CompletableFuture` are no longer fully qualified (D8); the empty `catch` in `captureRenewalNow` gets the same
  retry comment as `captureNow` (B1, behaviour unchanged).
- `AlphaKeyboardDictationService.java`: `active()` for the twice-written RECORDING||TRANSCRIBING check (C3);
  `FIELD_CONTEXT=64` for the four cursor-context reads (C6); `Configuration.UI_MODE_NIGHT_MASK/UI_MODE_NIGHT_YES` for
  `0x30/0x20` (D8); imports for `Settings`/`ComponentName` and the local `selected` (shadowed the field) renamed
  `current` (D8).
- `AlphaMapsTransportPlugin.java`: dropped `DEVELOPMENT_ORIGIN.isEmpty()` (implied by the same compile-time switch,
  B4); `REQUEST_ID` constant for the twice-written id regex (C3); connection setup through `AlphaUtil.noCache(…,10000,15000)`
  (B4 map J9, same four settings).
- `AlphaNavigationService.java`: removed the pre-Q branches (`SDK_INT < Q` operand in `declared`, the 2-arg
  `startForeground` fallback) and the `Build` import; minSdk is 29 (`android/consumer-host.json` `sdk.min`) (NEW-4/B4).
- `AlphaNoteAudioPlugin.java`: slot names from `Slots` (`NOTES_TRASH`, `NOTES_RECORDS`, `NOTES_AUDIO_DELETIONS`,
  `NOTE_AUDIO_METADATA_PREFIX`; values identical, the local constant names stay for `NotesTrashBackstopInstrumentedTest`)
  (B4 J8); `OPERATION` regex deleted, `AlphaUtil.isUuid(operation)` (operand never null: `keys().next()`) (B4 J2); the two
  manual comma joins are `String.join` (byte-identical, C3); `java.util.List` no longer qualified.
- `AlphaNoteRecorder.java`: `readJournal` uses `AlphaUtil.readBounded(in,MAX_JOURNAL_BYTES,"Recording index is too
  large")` (B4 J3); `validOwner` deleted, `AlphaUtil.isSha256Hex` (null→false as before) (J2); `ID=AlphaUtil.UUID_CANONICAL`
  (same text; `AlphaVoiceCloudPlugin:98` still reads `AlphaNoteRecorder.ID`); `segmentFile(dir,i)` reused by `recover`;
  `stopIfLowStorage()` for the two identical storage stops; `stopAndRelease()` for the three stop/release copies;
  `finishCurrent` computes its duration with `currentMs()` before clearing the recorder (same value) (C3).
- `AlphaLocalAgentPlugin.java`: deleted the 0-caller forwards `cloudProviderToken` and `applyUnboundEnvironment`
  (production launch uses `NativeProviderSlot.applyLaunchEnvironment` and re-applies the module itself) (A7/D4); the
  inline copy of `clearEnrollment()` in the reminder-session path now calls it (C3); reworded the "legacy per-dispatch
  timeout" comment (A8).
- `AlphaImageCapability.java`: dropped "(owner decision P-36, issue #420)" from the Javadoc (A8).
- `AlphaMediaConfig.java`: dropped "These names predate the shared engines" from the Javadoc (A8).
- Unchanged: `AlphaGmailPlugin.java`, `AlphaImageCapabilities.java`, `AlphaMailPdfActivity.java` (see Skipped).

Importer fixes (minimal, for the new `AlphaUtil` dependency): added `AlphaUtil.java` to the compile lists of
`test/notes-recorder.test.mjs` (NoteRecorderJournalTest), `specs/quint/refinement/native/note-recording.mjs`,
`note-recording-service.mjs`, `note-bridge.mjs` (AlphaNoteRecorder) and `navigation-service.mjs` (AlphaMapsTransportPlugin).

## Deleted tests and formal artefacts
- `test/local-agent-provider-admission.test.mjs`: deleted the source-text case "the plugin delegates provider rules…"
  (regexed the deleted `cloudProviderToken` forward); the behavioural host-JVM case stays.
- `test/product-character-host.test.mjs`: deleted the three source-text lines that sliced the deleted
  `applyUnboundEnvironment`; the `configureEnvironment` ordering assertions in the same case stay.

## Pins left broken
- None known. `specs/quint/native/manifest.json` model `sources` for NativeNoteRecording*/NativeNavigationOwnership do not
  list `AlphaUtil.java` (they list modelled files, not helpers; no check requires it).

## Skipped
- B4 J4 (`PluginWorkers.submit` → `AlphaUtil.submit`) in all owned files: `PluginWorkers.submit` is a shared helper, not
  a local duplicate, the swap is behaviour-neutral, and it breaks `test/plugin-worker-guard.test.mjs`,
  `test/native-plugin-teardown.test.mjs`, the `files-storage-refusal` transplant and the Quint slices in
  `hosted-result-notices.mjs`/`source-renewal-platform.mjs`/`gmail-background-platform.mjs`. Do it with the
  `PluginWorkers.java` deletion and the harness port (stage E). Raw `io.execute` sites in Gmail/IME left for the same reason.
- `AlphaLocalAgentPlugin`: all B4 rows (Slots literals, `isSha256Hex/isUuid/isOpaque36`, `readBounded`, `httpStatus`),
  `directProviderAllowed`/`startupRefusalMessage` inlining, `bindCloudProvider` 3-arg, CAS-provider helper, stream-retire
  helper, request-gate extraction, `requireOpenLocked`: about 30 Quint harnesses and many transplant tests compile or
  slice this file; deferred to the stage F split (U-A2). `providerCheckFailure`, 4-arg `saveVerifiedProvider`,
  `providerIdentity`, `applyProviderEnvironment`, `clearProviderSlot` kept: `LocalAgentProviderInstrumentedTest` calls them.
  `validProviderToken` kept (`AlphaConnectionPlugin:225`, other owner). `JSONException impossible` catches kept
  (`JSObject.fromJSONObject` also throws `JSONException`). "Older payloads…" workflow-worker comment: Q-AND-8. Test hooks:
  Q-AND-7. `launchSurface`/`takeInvocation`/`PowerLaunchPin`: D7/G8. "Invalid voice subscription." copy: Q-UI-12.
- Image capability merge (`AlphaImageCapabilities` → `AlphaImageCapability`) and `featureName` removal: needs edits to
  AlphaContacts/DeviceApps/System/Telephony and both manifests (other owners) and Q-AND-6 is Open; stage F.
- `AlphaGmailPlugin.notificationSettings`: Q-UI-21 Open. Foreground predicates (`OwnerSurface`) in Gmail, HostedResults,
  Files, MailAttachments, NoteDocuments: Q-AND-9 Open (security). HostedResults `runAsync` methods: Q-AND-10 Open;
  plugin split / constant move to `HostedNoticePoster`: Q-HOST-2 Open / cross-file. `MainThread`/base-plugin helpers do
  not exist.
- `AlphaMapsTransportPlugin.text()`: not identical to relying on `AlphaNavigationService.bounded` (truncation happens before
  vs after trimming leading whitespace/control characters), so it stays. Dev transport move to testMocks: stage F.
- `AlphaNavigationService` `snapshot()`/`stopCount`/`last*`: Q-AND-7 (test hooks) Open.
- `AlphaNoteAudioPlugin`: `migrationWorker` rename (pinned by `plugin-worker-guard`), `NotesTrashBackstop` extraction
  (file split, G5 worker name), shared `live(...)`/`runBackstop` helpers (small; left with the extraction).
- `AlphaKeyboardDictationService`: null checks on system services kept (they guard a permission predicate; not provably
  impossible on every image).
- `AlphaFilesPlugin`: `stopWatching` inlining (pinned by `files-browser.test.mjs:382`, which also runs real StorageBrowser
  JVM cases); `strings`/`reviewedTokens` merge (different semantics, flags would add code); `super.handleOnDestroy()`
  additions here and in HostedResults/NoteAudio (behaviour change, however small).
- `AlphaMailAttachmentsPlugin`: `openReviewedAt` reusing `reviewedBytes` (would honour an `opaque` flag on open: behaviour
  change); display-name helper in `SelectedDocumentAccess` (other owner).
- `AlphaMailPdfActivity`: colour resources (no colors resource exists; not a simplification).

## Verification
- `node --test test/notes-recorder.test.mjs test/files-storage-refusal.test.mjs test/files-browser.test.mjs
  test/files-legacy-storage.test.mjs test/local-agent-provider-admission.test.mjs`: 63 tests, 63 pass.
- `node --test test/product-character-host.test.mjs`: 8/8 pass. `node --test test/keyboard-dictation.test.mjs`: 5/5 pass
  (compiles the real `AlphaKeyboardDictationService` against android-36; a first run failed only on another unit's
  in-progress `KeyboardDictationCloud.java`, no error in this file).
- `node --test test/native-plugin-teardown.test.mjs test/plugin-worker-guard.test.mjs test/aosp-image-capability.test.mjs
  test/aosp-capabilities.test.mjs test/agent-always-local.test.mjs test/native-embedding-profile.test.mjs`: 54/54 pass.
- Quint: `node specs/quint/refinement/native/note-recording-service.mjs` passed (compiles `AlphaNoteRecorder` with
  `AlphaUtil`). `navigation-service.mjs` and `note-recording.mjs` compiled and generated their Java traces, then the Quint
  checker step timed out (`spawnSync … ETIMEDOUT` in batch 0) on this loaded machine; not a code failure, not re-run.
- Not run: Gradle compile/assemble (no generated Gradle project; disk 32 GiB free but the brief forbids assemble),
  emulator, AOSP image, device. Java changes in files no harness compiles (`AlphaMailAttachmentsPlugin`,
  `AlphaNoteDocumentsPlugin`, `AlphaNoteAudioPlugin`, `AlphaFilesPlugin` outside the sliced parts, `AlphaHostedResultsPlugin`
  outside its slices, `AlphaLocalAgentPlugin`) were checked by reading every caller with `git grep` (including androidTest,
  specs and test) and the upstream signatures (`DocumentBytes`, `DocumentFolderTree.result`, `Slots`, `AlphaUtil`).
