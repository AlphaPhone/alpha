# Chunk app-11 summary

Per-file reports: `docs/simplification-audit/files/apps/app/src/prototype/<name>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/camera-adapter.ts | SPLIT (`prototype/camera/*`, `prototype/photos/*`) + SIMPLIFY | 1737 | ≈1590 across split files (pre-formatter) |
| apps/app/src/prototype/canonical-calendar-drafts.ts | MERGE into `prototype/calendar-drafts.ts` (with calendar-form-draft-adapter, calendar-edit-draft-adapter) | 143 | ≈120 (inside a ≈220-line merged module replacing 283) |
| apps/app/src/prototype/canonical-notes-controller.ts | SIMPLIFY (optionally MOVE to `runtime/`) | 33 | ≈28 |
| apps/app/src/prototype/canonical-notes-editor.ts | DELETE | 1 | 0 |
| apps/app/src/prototype/canonical-notes-ui.ts | SIMPLIFY | 354 | ≈315 |
| apps/app/src/prototype/chat-overlay-motion-adapter.ts | SPLIT (pure release geometry → `runtime/chat-release.ts`) + SIMPLIFY | 973 | ≈850 here + ≈105 in `runtime/chat-release.ts` |
| apps/app/src/prototype/clock-adapter.ts | SIMPLIFY (later fold into one Workflows owner) | 114 | ≈95 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag` | type | camera-adapter.ts:40, canonical-calendar-drafts.ts:8, canonical-notes-ui.ts:15, clock-adapter.ts:5 | ~50 files in `prototype/` and `browser/` | `prototype/shell-types.ts` (`ViewApi`, `ViewState`) |
| `Shell` (`any`) | type | chat-overlay-motion-adapter.ts:22 | agent-adapter.ts:88, local-speech-playback.ts:22, use-in-email-review.ts:5, notes-trash-adapter.ts:15, notes-folders-adapter.ts:3, calendar-approval-adapter.ts:5, maps-chat-adapter.ts:55 | `shell-types.ts` `ShellHost` |
| `ShellPrototype` | type | camera-adapter.ts:163 | every lifecycle wrapper (D2) | `shell-types.ts` |
| `installViewPresence` | helper | camera-adapter.ts:165 | lifecycle wrappers in ~53 installers | shell hook registry |
| Camera/Photos plugin record types (`Photo`, `VideoReceipt`, `PreviewReceipt`, `Lens`, `LibraryAccess`, `SavedPhoto`, `EditPreview`, `EditReceipt`, `OwnedAlbum`) | type | camera-adapter.ts:41-46, 67-68, 133-135 | `browser-camera.ts` (browserCamera/browserPhotoLibrary mirror), `photo-library-adapter.ts`, `runtime/photo-library.ts`, `settings-adapter.ts:44` | `runtime/plugins/eliza-camera.ts`, `runtime/plugins/alpha-photos.ts` |
| `registerPlugin('ElizaCamera')` ×2, `'AlphaPhotos'`, `'AlphaMailAttachments'`, `'AlphaDevice'` | const | camera-adapter.ts:50, 65, 69, 102, 103 | `settings-adapter.ts:44` (`AlphaPhotos`), other AlphaDevice/AlphaMailAttachments call sites (C2) | `runtime/plugins/*` one module per plugin |
| base64→Blob | inline helper | camera-adapter.ts:1112, 1129, 1175 | phone-adapter.ts:41 `bytesOf`, browser/mail-attachments.ts:35,45, browser/note-recording-journal.ts:46, runtime/local-agent.ts:366,411 | `apps/app/src/lib/base64.ts` |
| `m:ss` formatter | inline helper | camera-adapter.ts:1229, 1377, 1612 | telephony-presenters.ts:20 `clockLength`, voice-adapter.ts:1434 | `clockLength` in `lib/` or `locale-time.ts` |
| AbortError check | inline | camera-adapter.ts:464,1442,1605; canonical-notes-ui.ts:133 | 7+ files in `prototype/` | `lib/abort.ts` `isAbortError` |
| Lucide URL builder | inline | camera-adapter.ts:831, 1466, 1487 | 8 files (research P13) | `icon-style.ts` |
| `ALBUM_KEYS` / `builtIn` / `names` | const | camera-adapter.ts:561, 1486, 1555 | each other | one `BUILT_IN_ALBUMS` table |
| `nativeId`/`normalize` + `'native-camera-'` literal | helper/const | camera-adapter.ts:373-374 (+6 literals) | selection-adapter.ts | `photos/library-store.ts` |
| civil-day `civil` | helper | canonical-calendar-drafts.ts:84 | 12 copies (runtime/calendar-form-draft.ts:8, calendar-form-draft-adapter.ts:11,42, calendar-edit-draft-adapter.ts:29, calendar-form-inputs.ts:3, calendar-interval-presentation.ts:5, agent-calendar-adapter.ts:47, browser/workflow-calendar.ts:2, browser/workflow-receipts.ts:15) | `runtime/civil-date.ts` |
| `ownsDraft`, store-binding decorator, `guardStart`, `submittedForm` | helper | canonical-calendar-drafts.ts:10, 17, 39-57, 133 | sibling calendar draft adapters | merged `calendar-drafts.ts` |
| `CANONICAL_NOTES_INVALIDATED_EVENT` | const | canonical-notes-controller.ts:6 | runtime/app-record-completion.ts:3 `NOTES_INVALIDATED_EVENT` (same string) | `runtime/app-record-completion.ts` |
| `CanonicalNotesViewHooks` | type alias | canonical-notes-controller.ts:5 | = upstream `NotesControllerHooks` | delete |
| `binding` (session tuple JSON) | helper | canonical-notes-controller.ts:7 | main.tsx:102,430, agent-adapter.ts:443,1429,1694, agent-calendar-adapter.ts:142 | `runtime/session-key.ts` |
| `CanonicalNotesEditor` | re-export | canonical-notes-editor.ts:1 | upstream `NotesEditor` | delete shim |
| `UNAVAILABLE='Agent offline'` | const | canonical-notes-ui.ts:17 | workflow-adapter.ts:466 literal | export from `runtime/connection-ui` |
| `DEVICE_ONLY_STATE`, `LOCAL_HANDLES` | const | canonical-notes-ui.ts:19, 23 | model.js Notes view device defaults; note-source/web-source adapters | delete after A1/A6 |
| `domainOf` | helper | canonical-notes-ui.ts:40 | browser-adapter.ts:408, inbox-cloud-adapter.ts:939 | `lib/url.ts` |
| Calendar handoff form literal | inline | canonical-notes-ui.ts:262 | calendar form defaults in calendar-form-draft / reminder adapters | `newCalendarForm()` factory |
| `Mode`, `Sample`, `ReleaseOptions`, flick/snap constants, `flickSpan`, `releaseVelocity`, `restingHeight`, `clampSheetHeight`, `chatRelease` | type/const/helper | chat-overlay-motion-adapter.ts:82-181 | chat mode literals in main.tsx/model.js; `200` literal at :335 | `runtime/chat-release.ts` |
| `scrollParent` | helper | chat-overlay-motion-adapter.ts:295 | runtime/dock-clearance.ts, subview-accessibility.ts | `runtime/dock-clearance.ts` |
| `isOpen`/`open` | helper | chat-overlay-motion-adapter.ts:355, 660 (+4 inline) | — | module-level `isOpen` |
| `dayNames` | const | clock-adapter.ts:55 | weekday names in locale-time.ts / telephony-presenters.ts `weekdayName` | `locale-time.ts` |
| `actions` / label chain | const | clock-adapter.ts:8, 102 | `ClockRequest['action']` in daily.ts | `clock-contract.ts` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `canonical-notes-editor.ts` (whole file) | 1-line rename re-export; sole importer canonical-notes-ui.ts:12 (`git grep canonical-notes-editor`: only manifests/lists besides) | High |
| camera-adapter.ts:66 `export {restartAfterResume}` | 0 importers; test imports upstream directly | High |
| camera-adapter.ts:104-105 `mediaAccessDenied` (+ `cameraAccessDenied` import) | 0 importers in apps/test/scripts/specs (docs only) | High |
| camera-adapter.ts:335 second `owner.set({nativeCopyRecovery:true})` | identical duplicate statement | High |
| camera-adapter.ts:194-200 legacy-notes scanned-note path | legacy "previous notes" (DECISIONS D1) | High (with agent-adapter legacy removal) |
| camera-adapter.ts:990-993 `legacyFile` (Android ≤9 `file://` receipts) + empty-id handling (997-1003, 1036, 1070) | minSdk 29 (`AndroidManifest.xml:35`); native camera pinned | Medium-High |
| camera-adapter.ts:1735 disposer and `disposed` checks | production ignores the return (`main.tsx:128`); only Quint `photos-window.mjs:131` calls it | Medium (depends on harness port) |
| canonical-calendar-drafts.ts:13 `destinationChanged`/`admitted` captures and their `?.call` | this file is the only definer of `calendarFormDestinationChanged`/`calendarFormAdmitted` | High |
| canonical-notes-controller.ts:5 `CanonicalNotesViewHooks` alias, :4 `NotesPhase` re-export | alias unused elsewhere; re-export only for canonical-notes-ui | High |
| canonical-notes-ui.ts:339-340, 346-349, 352 Previous-notes branch | DECISIONS D1 | High (coordinated) |
| canonical-notes-ui.ts `DEVICE_ONLY_STATE`, trash stubs, `LOCAL_HANDLES` | A6 undo layer over legacy device notes | Medium (after model.js cleanup) |
| clock-adapter.ts:27 legacy `localStorage` reader and `clockHandoffLegacyKey` | key never written by this package (`git grep clock-handoff:v1`); upstream option optional | High |
| clock-adapter.ts `blocked()` and `'Offline'` refusals (25, 61, 91) | always false: every mock source is already `testMocksEnabled`-gated (`main.tsx:111,119,187`) | High |
| chat-overlay-motion-adapter.ts:81/182 `chat-release:begin/end` markers | exist only for test slicing | High (after move) |

## Cross-file actions
1. **Delete Previous-notes (D1)**: canonical-notes-ui.ts (339-352), camera-adapter.ts (194-200), agent-adapter.ts (`notesSourceOptions` 1325-1331, legacy `vset` path, `notesSourceMode`), note-origin-adapter.ts:57,98, voice-adapter.ts:108-110, notes-trash-adapter.ts, notes-folders-adapter.ts, legacy-notes-access.ts, template.html (`olderNotesAction`, `returnToNotesAction`, `primaryNotes`), model.js Notes defaults; then remove `DEVICE_ONLY_STATE`/stubs in canonical-notes-ui.ts. Tests: `test/camera-scanned-note.test.mjs`, `test/previous-notes-source-opening.test.mjs`, `test/browser/legacy-notes-access.spec.ts`, legacy Quint `check-notes-view-refinement.mjs`.
2. **Delete canonical-notes-editor.ts**: canonical-notes-ui.ts:12/45/76, `specs/quint/application/manifest.json:283,1640,1689`, `test/browser/notes-photos-list-focus.spec.ts:11`, `test/support/feature-parity.mjs:360`.
3. **Notes invalidation event constant**: canonical-notes-controller.ts:6 → import from runtime/app-record-completion.ts:3; `specs/quint/refinement/application/canonical-notes-controller.mjs:59` and `canonical-notes-draft.mjs:30` read `CANONICAL_NOTES_INVALIDATED_EVENT` from the module.
4. **Merge calendar drafts**: canonical-calendar-drafts.ts + calendar-form-draft-adapter.ts + calendar-edit-draft-adapter.ts → `prototype/calendar-drafts.ts`; main.tsx:133-138 install lines (preserve order after `installAgentCalendarAdapter`); agent-calendar-adapter.ts:189 (`canonicalCalendarDraftEntryBlocker`), main.tsx:354 (`flushCalendarForAppUpdate`); fixture `test/fixtures/canonical-calendar-draft-owner.mjs` (path filter), Quint `canonical-calendar-draft-handoff.mjs`, `canonical-calendar-editor-close.mjs`, legacy `calendar-navigation.mjs`, manifest sources, feature-parity.
5. **Civil-date helper**: create `runtime/civil-date.ts`; replace in the 12 locations listed above.
6. **Move chat release geometry**: chat-overlay-motion-adapter.ts:81-182 → `runtime/chat-release.ts`; update `LemmaScript-files.txt:9`, move/regenerate `specs/lemma/apps/app/src/prototype/chat-overlay-motion-adapter.dfy(.gen)`, `specs/quint/application/manifest.json` symbol path for `chatRelease` (7871-7910), `test/chat-release.test.mjs`, `test/quint-chat-dock.test.mjs`.
7. **Chat dock state object**: chat-overlay-motion-adapter.ts fields → one object; update manifest symbol pins (`chatDraggedAt`, `chatSheetShare`, `dockKeyboardWatch`, `keyboardOpen`, `releaseComposer`), `test/quint-keyboard-detectors.test.mjs`, `test/final-ui-lifecycle.test.mjs`, `specs/quint/refinement/application/keyboard-focus.mjs`; keep `chatMotion` (read by main.tsx, model.js, browser-adapter.ts).
8. **Chat tap by data attribute**: chat-overlay-motion-adapter.ts:748-761 + template.html (pill/bar buttons get `data-alpha-chat-action`).
9. **Clock legacy key**: clock-adapter.ts:6,27; runtime/clock-handoff-history.ts:12-15 (drop `legacy` param/const); scripts/test-clock-handoff-flow.ts:10,66; test/fixtures/workflow-clock-admission.mjs:29.
10. **Clock flags**: clock-adapter.ts:20-25,60-61,70,91,110 + main.tsx:187 (`simulated: fixture || mock`).
11. **Camera/Photos split + plugin modules**: camera-adapter.ts → `prototype/camera/*`, `prototype/photos/*`; plugin interfaces shared with browser-camera.ts, photo-library-adapter.ts, settings-adapter.ts:44; importers agent-adapter.ts:13, native-adapter.ts:10, main.tsx:62/128, test/native-adapter-activity.test.mjs:14 (module path stub), test/browser/dev-image-question.spec.ts:8 (URL import); every text pin in the camera-adapter report (14 host tests, scripts/test-agent-camera-flow.ts, 3 manifests incl. symbol pins, 5 Quint harnesses incl. esbuild `onLoad` filter in photos-window.mjs).
12. **Shared micro-helpers**: `lib/base64.ts` (camera-adapter, phone-adapter, browser/mail-attachments, browser/note-recording-journal, runtime/local-agent), `clockLength` (camera-adapter, telephony-presenters, voice-adapter), `isAbortError` (camera-adapter, canonical-notes-ui + 7 prototype files), `session-key.ts` (canonical-notes-controller + main.tsx, agent-adapter, agent-calendar-adapter).
13. **Dev-only copy recovery**: camera-adapter.ts:292,335,347,350-356,1460,1477 → `dev/` module (with browser/domain-recovery usage) per DECISIONS D6.

## Text/path pins
- camera-adapter.ts: `test/camera-preview-recovery.test.mjs`, `test/camera-resume.test.mjs:28-30` (verbatim import + `resumed` statement regex), `test/camera-scan-keep.test.mjs`, `test/camera-scanned-note.test.mjs`, `test/camera-capture-mode-patch.test.mjs`, `test/context-selection.test.mjs:164,214`, `test/photo-library.test.mjs:230`, `test/photo-selection-cancel.test.mjs`, `test/photos-library-patch.test.mjs:26,89`, `test/photos-pending-read.test.mjs`, `test/photos-thumbnail-refresh.test.mjs`, `test/photos-view.test.mjs:84,118`, `test/recently-deleted.test.mjs:44`, `scripts/test-agent-camera-flow.ts:7-16` (5 slices), `test/fixtures/calendar-mounted-editor.mjs:12`, `test/native-adapter-activity.test.mjs:14`, `test/browser/dev-image-question.spec.ts:8`, `test/browser/notes-photos-list-focus.spec.ts:8`; `specs/quint/application/manifest.json` (sources + symbols `takeRequestedPhoto`, `untilSettled`, `agentRequest`, `requestedCaptureHolds`, `waiters`), `specs/quint/native/manifest.json:3761-3789` (symbols `finalizing`, `recordingStarting`, `stopRecording`), `specs/quint/legacy/manifest.json:864,966`, Quint `photos-window.mjs`, `camera-preview-retirement.mjs`, `canonical-calendar-draft-handoff.mjs`, legacy `camera-session.mjs`, `check-photos-library-refinement.mjs:354`; `test/support/feature-parity.mjs:357`.
- canonical-calendar-drafts.ts: `test/fixtures/canonical-calendar-draft-owner.mjs:6,25,93`, `specs/quint/application/manifest.json:2496,3303,3337`, Quint `canonical-calendar-draft-handoff.mjs:11`, `canonical-calendar-editor-close.mjs:17`, legacy `calendar-navigation.mjs:14`, `feature-parity.mjs:358`.
- canonical-notes-controller.ts: `specs/quint/application/manifest.json:282,1615,1665,1716`, Quint `canonical-notes-controller.mjs:7,59`, `canonical-notes-draft.mjs:30`, `test/quint-canonical-notes-controller.test.mjs`, `test/canonical-notes-webview-abort.test.mjs:20`, `test/browser/helpers/canonical-notes.ts:15,21`, `notes-photos-list-focus.spec.ts:11`, `feature-parity.mjs:359`.
- canonical-notes-editor.ts: `specs/quint/application/manifest.json:283,1640,1689`, `notes-photos-list-focus.spec.ts:11`, `feature-parity.mjs:360`.
- canonical-notes-ui.ts: `test/app-record-pending-actions.test.mjs`, `test/notes-view-defaults.test.mjs:32-33`, `test/canonical-notes-webview-abort.test.mjs:37` (whole-file eval with injected import names), `test/camera-scanned-note.test.mjs:7`, `test/canonical-note-calendar-admission.test.mjs`, `test/canonical-recording-audio-save.test.mjs`, `test/notes-recorder-controls.test.mjs:106`, `test/browser/canonical-notes.spec.ts:65,484,504`, Quint `canonical-notes-feedback.mjs:9`, `canonical-notes-view.mjs:23`, `notes-recorder-media-admission.mjs:12`, `canonical-calendar-draft-handoff.mjs:12`, legacy `check-notes-view-refinement.mjs:359`, manifests (`application` 284,1664,1715,3338,3431; `legacy` 1094), `feature-parity.mjs:361`.
- chat-overlay-motion-adapter.ts: `LemmaScript-files.txt:9` + `specs/lemma/apps/app/src/prototype/chat-overlay-motion-adapter.dfy(.gen)`, `test/chat-release.test.mjs:8-9`, `test/quint-chat-dock.test.mjs:11-16`, `test/quint-keyboard-detectors.test.mjs:13-16`, `test/final-ui-lifecycle.test.mjs:44,59,79,96` (tab-indented slice markers), `test/accessibility-coverage.test.mjs:247`, `test/fixtures/modal-scrim-chromium.mjs:12`, `specs/quint/application/manifest.json` (sources 2777,3871; symbols 7871-7910, 9772-9790), Quint `keyboard-focus.mjs:9`, legacy `check-chat-input-refinement.mjs:17`, `check-home-layout-refinement.mjs:359`, `specs/quint/legacy/manifest.json:535`, `feature-parity.mjs:362`.
- clock-adapter.ts: `scripts/test-clock-handoff-flow.ts:11,66` (vm-evaluated with injected globals), `test/fixtures/workflow-clock-admission.mjs:12,29,127`, `specs/quint/application/manifest.json:1268`, `feature-parity.mjs`.

## New patterns
- **NEW-a: copy-paste duplicate statement** — the same call written twice in one statement list (`camera-adapter.ts:335` `owner.set({nativeCopyRecovery:true});owner.set({nativeCopyRecovery:true});`). Hard to spot in statement-soup files; a formatter + lint `no-dupe` style check would catch it.
- **NEW-b: `?? ` fallthrough relying on `&&` yielding `undefined`** — `(drag && paintedHeight(drag)) ?? …` (`chat-overlay-motion-adapter.ts:609`): correct only because `drag` is `undefined` not `null`/`false`. Use a ternary.
- **NEW-c: CSS-duration-coupled timer literals** — JS `setTimeout` values (460, 480, `CLOSE_MS`) hand-matched to CSS transition durations in strings (`.42s`). Derive both from one constant.
- **NEW-d: magic retry bounds** — `settle()` loops up to 8 ticks (`canonical-notes-ui.ts:140`) without a named constant or rationale.
- **NEW-e: test-only disposers** — installer return values that production ignores and only a formal harness calls (`camera-adapter.ts:1735` via `photos-window.mjs:131`), which keeps a `disposed` flag threaded through 110 sites. Fits D7 but worth calling out because of its spread.

## Owner questions
1. `installPrototypeCameraAdapter`'s disposer is only called by the Quint Photos-window harness: may the harness be ported so the disposer and every `disposed` fence (110 references) can be deleted, or must installers stay disposable?
2. Camera `legacyFile` (`file://` capture receipts, "Android 9 and older or a build without the patch"): minSdk is 29 and the camera plugin is pinned — confirm no supported AOSP image/camera build returns `file://` so the branch and empty-id handling can go.
3. Moving the LemmaScript-verified chat release functions to `runtime/chat-release.ts` changes the Dafny artifact path (`specs/lemma/...`): acceptable to regenerate under the new path in the same change?
4. Browser-mode test-mocks copy ("Copy request could not be retained…", "Saved-copy recovery", domain recovery dialog) in camera-adapter: move it wholesale behind the `dev/` boundary, leaving production with the short strings only?
5. Chat pill/bar tap actions are chosen by aria-label text; OK to add `data-alpha-chat-action` attributes to `template.html` so copy edits cannot break gestures?
