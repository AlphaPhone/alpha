# C-app-07 — chunk app-07 in-file cleanup

All 24 files in `chunks/app-07.files.txt` still exist. `build-flags.ts` (`updateChannelCheckEnabled`, A3) and
`icon-catalog.json` (Wallet keys, A3) had already been changed by stage A. The stage-A ledgers also record the
`workflow-history.ts` "⤓ Older" download, the `workflow-notices`/`workflow-drafts`/`workflow-resources` legacy readers
and `voice.ts` `migrateAudio`/`migrationStatus` (A2), and the Wallet parts of `workflow-receipts.ts` (A3) as done.

## Done

- `browser/video-transcode.ts`: `MAX_BYTES` constant for the two `100*1024*1024` limits (C6); `abortError('Video export cancelled')` from `lib/abort` (C3, B1 map).
- `browser/workflow-calendar.ts`: local `civil` replaced by `civilDay` from `lib/civil-date` (C3, B1 map).
- `browser/workflow-dated-sources.ts`: the dev inbox read and filter, written twice, is now one local `overnightInbox()` (C3).
- `browser/workflow-drafts.ts`: local `tooLarge()` for the two identical 100 000-byte checks. Messages unchanged (C3).
- `browser/workflow-focus.ts`: `triggerDefinition` imported from `workflow-triggers.ts` instead of two inline copies (C3); `abortError` ×2; `focusSnapshot` typed through `AlphaNotificationsBrowserMethods` (C2, B2 map).
- `browser/workflow-history.ts`: local `object` guard replaced by `isRecord` from `lib/parse` (C3, B1 map); deleted the two `<p hidden>` description elements that were never filled, shown or referenced (A7).
- `browser/workflow-local-send.ts`: local `saved(kind)` for the four identical receipt objects (C3).
- `browser/workflow-location.ts`: deleted the production branch of the Home-place error. The module is reachable only through `installSimulatedWorkflows`, which returns early unless `devSurfacesEnabled` (A4/B4). The `build-flags` import went with it. `abortError` (B1).
- `browser/workflow-messages.ts`: `Object.defineProperty` on a `{}` replaced by assignment on an `Object.create(null)` record (the same `__proto__` safety) (D8).
- `browser/workflow-notices.ts` (product): `digest` is now `sha256Hex(JSON.stringify(text))`. The input encoding and the stored digests are unchanged (B1 map). `isSha256Hex` for the four binding/digest checks and `isOperationId` for the two id checks (the same character set, B1 map). The local `blocked` predicate is replaced by `noticeActionBlocked`, which is the same expression (C3).
- `browser/workflow-receipts.ts`: lock and background predicate replaced by `noticeActionBlocked` (C3). `abortError`.
- `browser/workflow-resources.ts`: removed the outer `signal.throwIfAborted()`. `navigator.locks.request` rejects with the same `signal.reason` for an aborted signal, and the check inside the lock stays (B3).
- `browser/workflow-result-input.ts`: `noticeActionBlocked` and `abortError`. `use.onclick` no longer re-checks the condition that already sets `use.disabled` (B4).
- `browser/workflow-speech.ts`: the inline lock predicate is now `noticeActionBlocked`, the same expression that `browserScreenLocked` evaluates (C3). `abortError`.
- `browser/workflow-urgency.ts`: `noticeActionBlocked` replaces the local `blocked`. Dropped the `signal.throwIfAborted()` in `reviewUrgency`: its only caller checked the signal synchronously just before (B3). `abortError` ×2.
- `browser/workflow-trigger-runtime.ts`: `foreground` is now `!noticeActionBlocked()`; local `sha` replaced by `sha256Hex(JSON.stringify(...))` with the same input, so persisted `sourceHash` values match (B1 map); `ElizaLocation` typed `Pick<LocationBridge,'checkPermissions'>` (B2 map).
- `browser/workflow-triggers.ts`: `placeZone` moved up and reused by `placeValue` (C3). `person` is computed once per flow (C6). A `MAX_SEEN` constant replaces the four `10000` history limits (C6). Annotated functions are untouched. `lsc gen` reproduces the committed `workflow-triggers.dfy.gen` byte for byte.
- `browser/voice.ts`: deleted the duplicate `devSurfacesEnabled` guard in `cloudBinding`. Both of its callers (`transcribeRecording`, `synthesize`) guard first (B4). The two inline `import('../prototype/note-recorder').NoteRecordingBinding` types are now one `import type` (D8).
- `daily.ts`: the 26-method inline plugin generic is replaced by `registerPlugin<DailyAppsPlugin>` from `native/daily-apps.ts` (C2, B2 map); unused imports dropped. Record types and the `DailyApps` export are unchanged.
- `local-speech-playback.ts`: `registerPlugin<any>` and `voice:any` replaced by narrow `PlaybackPort`/`SpeechPort` types built from `AlphaVoiceCloudPlugin` (C2, B2 map). `playOwnedSpeech` takes `PlaybackPort`, so `runtime/cloud-voice.ts`'s current native type still fits. Removed the issue number from one comment (A8). Every change is type-only, and the Quint/transplant harnesses that strip types still run.
- `main.tsx`: `registerPlugin<SystemBarsPort>` from `native/alpha-device` (B2 map); the three `browserDevProfile` blocks inside `!fixture` are now one `if(!browserDevProfile){…}else{…}` in the same install order (D9); issue numbers removed from two comments (A8).

## Deleted tests and formal artefacts

- `test/system-bar-appearance.test.mjs`: deleted only the case "the launcher shell installs it and the plugin sets both icon appearances". It was a source-text case (T1) that regex-matched the `registerPlugin<SystemBars>` line of `main.tsx` and a Java method body. The two behavioural cases stay and pass. The `readFileSync` import went with it.

## Pins left broken

None found. Quint harnesses that bundle or transplant these files were re-run and pass: `quint-renderer-speech-chunk`, `quint-speech-cleanup-latch`, `quint-web-reading-review`, `quint-trigger-cursor`, `trigger-cursor-isolation`. Lemma: `lsc gen` for `workflow-triggers.ts` left the committed `.dfy.gen` unchanged. Dafny was not run.

## Skipped

- Every finding that moves, merges or splits files: the `workflow-calendar`/`dated-sources`/`messages` → `dev/workflow-sources.ts` merge, the `workflow-resources`/`workflow-speech` merge into `simulated-workflows.ts`, the `voice.ts` and `main.tsx` splits, the `local-speech-playback` rename and moving `daily.ts` into `native/`. These belong to stage F. The `speakWorkflowText` alias stays because removing it needs an edit in `simulated-workflows.ts`, which another implementer owns.
- Whole dev workflow simulator, Lemma proof and Quint model: Q-DEV-1 is still Open (D20 keeps code and proof together).
- Shared `Bag`, `devAppState`, `openOwnedDialog`, `observedDocument`, `readConnectionSelection` and `placeSide`: no owner exports them yet, and the brief does not let me edit owners.
- `workflow-calendar.ts`, `workflow-focus.ts`, `workflow-trigger-runtime.ts` AlphaCalendar typing (`Pick<AlphaCalendarPlugin,'list'>`): the `list` result is a union whose `permission-required` arm has no `events`, and the rows read `video`/`who`, which `AndroidCalendarEvent` does not declare. Typing it means casts or a behaviour change. Left as is.
- `workflow-notices.ts`: `actOnWorkflowNotice` → `beginNoticeAction` is not identical (`beginNoticeAction` aborts immediately when the page is already hidden, which changes the thrown error from "Notification changed." to AbortError). `savedWorkflowNoticeHistory` has no `apps/` caller, but about 10 page.evaluate sites in 3 browser specs use it; stage E owns those specs. The `typeof title` check stays because the title comes from an agent operation (trust boundary). Moving to `observedDocument` is not done: no shared helper exists. The validator stays at every edit.
- `workflow-drafts.ts`: the `browserDevProfile` re-check stays because it is the dev gate and dev surfaces must stay unreachable. The `typeof input.value` check stays at the secure-slot port boundary.
- `workflow-trigger-runtime.ts`: `app()` → cached `this.stored()` is skipped because the cache shares parsed objects with `dispatch`, which risks mutating them. The duplicate cursor validation stays because removing it changes which error message is shown.
- `voice.ts`: three `25_000` → `NOTE_SEGMENT_MS` were applied, then reverted. The transplant test `test/browser-saved-transcript-audio.test.mjs` slices `transcriptionAudio` without the constant in scope, and its 5 cases cover the 25 s window maths. Also not applied: the `lib/` migrations (`abortError` ×15, `isSha256Hex`, `noticeActionBlocked` at `play`) and the `assertIdle`/`PreparedAudio.add` helpers. Each adds a free identifier that breaks the four T2 transplant suites (`browser-note-pending-audio`, `browser-streamed-speech`, `browser-voice-cancellation`, `direct-browser-transcription`). Those are the only coverage of that code until stage E replaces them. The A1 pre-journal recovery branch (lines 52-58) stays: it also covers a crash between `retainPendingAudio` and the journal save in the current code, so it is not a reader of legacy data only. `saveRecording` stays (Q-UI-29 Open). Making `BroadcastChannel` required is also skipped.
- `local-speech-playback.ts`: the `speakChunk` options bag, `withSpeechDeadline`, `retryWhileBusy` and `lib/abort`/`lib/error-text` migrations are skipped. The Quint harness `renderer-speech-chunk.mjs` and six host tests transplant this file with imports stripped, and the manifest pins `speakChunk`'s positional shape.
- `daily.ts`: `restoredResult`/`restoreSelected`/`reminderDecision` stay (Q-UI-29 Open). The `ClockResult` rename is skipped because the brief does not allow renaming an export used elsewhere.
- `main.tsx`: the flag re-ANDs (`devSurfacesEnabled&&…`, `testMocksEnabled&&mock`) and the `simulatedApps` guard stay: A3 found that removing them breaks constant folding and `audit:bundle`. The workflow/automations install merge stays because Q-UI-1 is Open. The adapter list, inset cache, update gate, mock banner and dev-tools moves are stage F splits. `sessionKey` at the deletion owner belongs to `browser/deletion-recovery.ts` (B1 map). `readConnectionSelection` does not exist.
- `build-flags.ts`: the `import.meta.env !== undefined` shim stays: the Node loaders and `test/dev-local-launcher.test.mjs` need it until stage E.
- `icon-style.ts`, `icon-catalog.json`: KEEP, no further change.

## Verification

- `npx tsc --noEmit -p .`: no errors in any owned file. The only errors are 2 in `prototype/browser-adapter.ts`, which another implementer is editing.
- `node --test` on each file, all passing: browser-note-pending-audio 7/7, browser-saved-transcript-audio 5/5, browser-streamed-speech 2/2, browser-voice-cancellation 5/5, cloud-voice-limit 7/7, direct-browser-transcription 4/4, notes-recorder 33/33, agent-always-local 9/9, workflow-trigger-detection 14/14, system-bar-appearance 2/2, local-speech-playback 4/4, local-speech-native-drain 4/4, local-speech-text 6/6, app-speech-route 9/9, local-conversation-cleanup 4/4, navigation-voice-pause 19/19, offline-signed-out-speech 4/4, voice-replies 10/10, home-inset-layout 4/4, voice-in-chat-only 3/3, product-identity 8/8, image-contacts-admission 4/4, retired-shell-work 2/2, startup-warning-retention 1/1, theme-palette 3/3, video-capture-limit 5/5, quint-view-admission 1/1, quint-keyboard-detectors 1/1, quint-keyboard-geometry 1/1, dev-local-launcher 2/2, quint-renderer-speech-chunk 1/1, quint-speech-cleanup-latch 1/1, quint-web-reading-review 1/1, quint-trigger-cursor 3/3, trigger-cursor-isolation 1/1.
- `node scripts/test-canonical-notification-navigation.ts`: PASS.
- `node node_modules/lemmascript/tools/dist/lsc.js gen --backend=dafny apps/app/src/browser/workflow-triggers.ts`: the committed `.dfy.gen` was unchanged. Dafny was not run.
- Playwright (chromium) on a shared dev server while other implementers were editing files:
  - Run 1: `workflow-notices` + `dev-workflow-history`: 12 passed and 1 failed (an element was detached during a re-render). That one case passed when re-run on its own.
  - Run 2: `dev-workflow-calendar`, `-dates`, `workflow-dialog-layout`, `workflow-notice-history`, `workflow-notification-recovery`, `browser-foreground` passed. Failures in `dev-workflow-focus/-messages/-receipts/-speech` were "Execution context was destroyed" or "Failed to fetch dynamically imported module". Concurrent edits caused those Vite reloads, and one "AlphaCalendar plugin is not implemented on web" error came while `browser/calendar.ts` was being edited.
  - Run 3: those four specs again with `--retries=1`: 54 passed, 3 flaky (passed on retry), 0 failed.
- Not run: `npm run --ignore-scripts build`, `npm run audit:bundle` (parallel stage; other files are mid-edit), `npm run verify`, Android/Gradle (no Java touched).
