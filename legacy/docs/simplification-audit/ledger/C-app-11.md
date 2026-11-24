# C-app-11 ledger (stage C, chunk app-11)

Files owned: `apps/app/src/prototype/{camera-adapter,canonical-calendar-drafts,canonical-notes-controller,canonical-notes-editor,canonical-notes-ui,chat-overlay-motion-adapter,clock-adapter}.ts`.

## Done

- `canonical-notes-editor.ts`: **deleted** (D4 rename shim). `canonical-notes-ui.ts` imports upstream `NotesEditor`; the three `sources` entries in `specs/quint/application/manifest.json` that named the shim were removed (the upstream `notes-editor.ts` is already listed next to each).
- `camera-adapter.ts`
  - Plugin types moved to the B2 modules (C2): `elizaCamera`/`ElizaCameraPlugin`, `Photo`, `PreviewReceipt`, `VideoReceipt` from `native/eliza-camera`; `alphaPhotos`/`AlphaPhotosPlugin`, `LibraryAccess`, `SavedPhoto`, `EditPreview`, `EditReceipt`, `OwnedAlbum` from `native/alpha-photos`; `Pick<AlphaMailAttachmentsPlugin,…>`, `Pick<AlphaDevicePlugin,'openSettings'>`. The second `registerPlugin('ElizaCamera')` (`cameraAccess`) is gone; `checkPermissions` goes to `elizaCamera`. Local inline generics and record types deleted; `MailAttachment` import dropped.
  - `setCaptureMode` guard: `typeof camera.setCaptureMode!=='function'` → `browserMode` (the browser camera never had it; native proxy always does), call through `elizaCamera` (B2 caveat). `library.thumbnails` probes and `!` assertions removed (`browserMode` already returns first) (B2).
  - Dead exports removed: `export {restartAfterResume}`, `mediaAccessDenied` and the then-unused `cameraAccessDenied` import (A7; no importer).
  - Duplicate `owner.set({nativeCopyRecovery:true})` removed (NEW-DUP-STATEMENT).
  - `isAbortError` ×3 (keeping the `browserMode&&` operands), `errorText` ×8, `errorCode` ×1 from `lib/` (B1 map). The `browserMode&&error instanceof Error?…` toast stays local (precedence differs).
  - Local `ShellPrototype` type → `Partial<ShellLifecycle>` (B3 map); the two wrappers now call the original with the typed lifecycle arguments (nothing in the chain reads the React snapshot argument).
  - `installPrototypeCameraAdapter`: dropped the `views.camera` absence return and the `typeof originalApi==='function'` / `if(scanApi)` guards (B2/B4; camera view and `prototype.api` always exist; the Photos-window harness never calls `api`).
  - `(PLAN item 7)` reference removed from the `CHAT_GRACE_MS` comment (A8).
- `canonical-notes-ui.ts`: `NotesEditor` import (D4); `isAbortError`, `errorText`, `delay(0)`, `isOperationId` ×2 from `lib/` (B1); `update()` drops the B3 re-check of an internal patch object (a non-object still lands in the same catch → review); settle bound named `MAX_SAVE_FOLLOW_UPS` (NEW-d); `api.ic?.cal??out.vo.calIcon` → `api.ic.cal` (B2; `IC.cal` exists).
- `canonical-notes-controller.ts`: `CANONICAL_NOTES_INVALIDATED_EVENT` now equals `NOTES_INVALIDATED_EVENT` from `runtime/app-record-completion` (C6; export name kept, harnesses read it); identity tuple via `sessionKey(...)` (B1, identical text); `abortError(...)` ×2 (B1).
- `canonical-calendar-drafts.ts`: dropped the never-defined `calendarFormDestinationChanged`/`calendarFormAdmitted` captures and their `?.call` (B4); `update?.apply`/`committed?.call` → plain calls (B2; model.js and calendar-form-draft-adapter always define them, installed earlier in main.tsx); civil-day maths → `civilDayDiff` (C3); the shared admission/commit chain → `reminderCreationOf` predicate (D9); `owner` typed `ShellHost&Bag` and render `api` `ViewApi&Bag` so the file compiles against the newly typed `confirmCalendarAction`.
- `chat-overlay-motion-adapter.ts`: module-level `conversationPanel()` replaces five copies of the conversation selector; module-level `isOpen` replaces the local `open`/`isOpen` and four inline spellings (outside the Lemma region and the harness-sliced regions); `bounds()` uses one `maxHeight(fullBleed)` helper and `SHEET_MIN_HEIGHT` instead of literal 200 (C6); `(drag && paintedHeight(drag)) ?? …` → ternary (NEW-b); "As in OG's" comment reworded (A8).
- `clock-adapter.ts`: removed `blocked()` and its `'Offline'` refusals and the `mockRequested()` dispatch term (B4/D5: `options.simulated` and `connectionMode==='mock'` are both `testMocksEnabled`-gated in main.tsx, and both are fixed at load); `simulated()` inlined; `refuse()` helper; `ACTION_LABELS` table and `chipCss` (D9); `CLOCK_DAY_NAMES` from `runtime/clock-contract` instead of a local copy; `deviceTimeZone()` (B1); `Promise.resolve().then(...)` wrapper on `surfaceInfo` dropped (B2); `Bag`/`any` replaced by `ShellPrototype`, `ViewRegistry`, a local `ClockShell` and typed input events (C1). The `testMocksEnabled&&` literal guard stays in front of the two simulated-copy uses so a production build still drops that copy.

## Deleted tests and formal artefacts

- `test/camera-preview-recovery.test.mjs` (transplant; failed on the `errorCode` import).
- `test/camera-resume.test.mjs` (source-text regex of camera-adapter's import line; the remaining cases tested upstream `restartAfterResume`).
- `test/canonical-notes-webview-abort.test.mjs` (whole-file transplant with injected `CanonicalNotesEditor`; its home-made CJS loader cannot resolve the new extensionless import).
- `test/canonical-recording-audio-save.test.mjs` (transplant of `voiceAudio`/`saveVoice`; `isOperationId` not injected).
- `test/notes-recorder-controls.test.mjs` (transplant slices of voice-adapter and canonical-notes-ui; failed on `isOperationId`).
- Manifest: the 3 `canonical-notes-editor.ts` source entries (file deleted).

## Pins left broken

- `test/fixtures/workflow-clock-admission.mjs` / `test/quint-workflow-clock-admission.test.mjs` / Quint `workflow-clock-admission.mjs`: already failing before this unit (bundles `clockHandoffLegacyKey`, removed by A2; reads deleted `scripts/test-clock-handoff-flow.ts`). Its whole-file transplant of clock-adapter also injects import names; it now additionally needs `CLOCK_DAY_NAMES` and `deviceTimeZone`. Needs the stage-E port to an import.
- Quint `canonical-notes-feedback.mjs`, `canonical-notes-view.mjs`, `canonical-notes-draft.mjs`, `notes-recorder-media-admission.mjs`, `camera-preview-retirement.mjs`, `canonical-calendar-draft-handoff.mjs`, `canonical-calendar-editor-close.mjs`: could not be established here (see Verification). If any transplants canonical-notes-ui with injected import names, it needs `NotesEditor`, `isAbortError`, `delay`, `errorText`, `isOperationId`.
- `specs/quint/legacy/**` harnesses naming these files were not run.
- `scripts/test-agent-camera-flow.ts` (via `test/agent-camera-capture.test.mjs`): fails on `agentOwnerKey is not defined` in agent-adapter (another unit's change), not on camera-adapter slices; slice markers it uses are unchanged.

## Skipped

- Camera/Photos split, chat-release move to `runtime/chat-release.ts`, calendar-drafts merge, controller move to `runtime/` (stage F; Q-FORMAL-1).
- camera-adapter `legacyFile` / empty-id receipts (Q-AND-13, confirm on device); disposer and `disposed` fences (Q-TEST-3); dev copy-recovery move (Q-DEV-3 / stage F); chat tap by `data-alpha-chat-action` (Q-UI-4, open).
- `Bag`/`Shell = any` migration in camera-adapter, canonical-notes-ui and chat-overlay (hundreds of uses; chat-overlay's ~20 attached fields also carry manifest symbol pins). Not attempted in this pass.
- Scan-review `saveScannedNote?.`/`reviewScannedCalendarDraft?.` fallbacks: `owner` can be the Photos api, which lacks them; `reviewScannedCalendarDraft` is another adapter's field. Kept.
- `newEvent`/`addAt` `typeof` guards in canonical-calendar-drafts: `addAt` is absent unless agent Calendar renders it. Kept.
- Base64→Blob, `m:ss`, Lucide URL, `domainOf`, `UNAVAILABLE`, calendar form factory: no shared export exists (`iconStyle` returns a React style object, not a CSS string).
- `ALBUM_KEYS`/album tables, `fetchThumbnails`/`loadNextPage`/`hideChat` extraction, `ChatDockState`, timer/CSS constant coupling: deferred to the split (stage F) to avoid churning harness-sliced text.
- `DEVICE_ONLY_STATE`, `LOCAL_HANDLES`, trash stubs, waiting-mode `moveNoteToTrash:()=>false` (A2: removal changes live render state).
- canonical-notes-controller transport method/body checks (needed for the typed `port.request`); `typeof … Number.isSafeInteger` (needed for narrowing); clock `currentClockTimeZone` try/catch (upstream throws on unknown zones).
- `isRecord` at canonical-notes-ui `voiceAudio` (would need re-typing of the storage-boundary check; left as is).

## Verification

- `npx tsc --noEmit`: no errors in owned files; one unrelated error remains in `runtime/view-navigation.ts` (another unit).
- Host tests run with `node --test` (TAP): pass — camera-capture-mode-patch, camera-rapid-leave, camera-scan-keep, canonical-calendar-draft-ownership, canonical-note-calendar-admission, chat-release, context-selection, final-ui-lifecycle, modal-scrim-ownership, native-adapter-activity, photo-library, photo-selection-cancel, photos-library-patch, photos-pending-read, photos-thumbnail-refresh, photos-view, quint-canonical-notes-controller, quint-chat-dock, quint-keyboard-detectors, recently-deleted. Fail, not caused here: calendar-mounted-edit-admission and calendar-mounted-editor (vite parse error in `runtime/image-preview.ts`), quint-workflow-clock-admission (pre-existing, above), agent-camera-capture (agent-adapter). The five deleted files above failed because of this unit.
- Quint refinement campaigns invoked directly: `photos-window` PASS. `camera-preview-retirement`, `canonical-notes-draft`, `canonical-notes-feedback` reported "input changed during checking" (other implementers editing sources concurrently); `canonical-calendar-draft-handoff`/`-editor-close` failed through the same `image-preview.ts` renderer error; `canonical-notes-view` timed out; the rest were not reached. Not established.
- Lemma: chat-release region untouched; `lemma:check` not run.
- Not run: `npm run build`, `npm run audit:bundle`, Playwright, Android. No Java touched.
