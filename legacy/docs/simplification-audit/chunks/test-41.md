# Chunk test-41: host tests notes-logical-revision … own-provider

26 files, all read in full. Per-file reports are under `docs/simplification-audit/files/test/`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/notes-logical-revision.test.mjs | integration (upstream Notes store via `loadNotesSource`) | MERGE | `test/integration/notes-store.test.mjs` (drop schema 1/2 case) |
| test/notes-organize.test.mjs | unit (real contract/executor, fake host) | MERGE + REWRITE | validator table → `test/integration/notes.test.mjs`; stale-revision / missing-folder agent moves → `journeys/notes.spec.ts` |
| test/notes-owner-retirement.test.mjs | transplant + source-text, legacy Notes | DELETE | composer draft-binding case → `journeys/chat.spec.ts` if absent |
| test/notes-pending-editor.test.mjs | transplant, legacy Notes | DELETE | — |
| test/notes-recorder-controls.test.mjs | transplant + template source-text | DELETE | 3 assertions → `journeys/notes.spec.ts` |
| test/notes-recorder-media-admission.test.mjs | Quint wrapper (duplicate of aggregate) | DELETE | — |
| test/notes-recorder.test.mjs | unit + source-text + host-JVM (real class) | REWRITE (split) | race cases → `test/integration/notes-recorder.test.mjs`; flows → `journeys/notes.spec.ts`; JVM journal → `test/android-jvm/note-recorder-journal.test.mjs`; manifest checks → `verify-apks` |
| test/notes-replay-identity.test.mjs | integration (upstream Notes store) | MERGE | `test/integration/notes-store.test.mjs` |
| test/notes-state-trash-compat.test.mjs | unit of upstream validator | DELETE | — (covered by store restarts) |
| test/notes-store-lifecycle.test.mjs | integration (upstream Notes store) | MERGE | `test/integration/notes-store.test.mjs` |
| test/notes-trash-read.test.mjs | transplant + Quint wrapper, legacy Notes | DELETE | with fixture, driver and `NotesTrashReadPublication` model |
| test/notes-view-defaults.test.mjs | transplant of `model.js` notes module | DELETE | 2 assertions → `journeys/notes.spec.ts` |
| test/notes-view.test.mjs | unit (real pure modules) + 1 source-text | MERGE | `test/integration/notes.test.mjs` (4 cases) |
| test/notice-owner-coordinator.test.mjs | upstream unit in a child process | DELETE | upstream follow-up |
| test/notice-owner-startup.test.mjs | transplant of `connection-ui.tsx` + source-text | DELETE | 2 assertions → `journeys/startup-permissions.spec.ts` |
| test/notification-installation-root.test.mjs | Java slice transplant | MERGE + PORT | `test/android-jvm/notification-owner.test.mjs` (compile extracted class unsliced) |
| test/notification-persist-owner-branches.test.mjs | Java slice transplant | MERGE + PORT | same as above |
| test/offline-signed-out-speech.test.mjs | transplant + unit | REWRITE | `journeys/voice.spec.ts` (offline + signed out) |
| test/one-runtime-profile.test.mjs | tombstone tooling + source-text, spawns 7 processes | DELETE | with `scripts/removed-profile-flags.ts` |
| test/optional-view-channel-chat.test.mjs | transplant of `send` + agent-adapter | DELETE | 2 cases → `journeys/chat.spec.ts` |
| test/os-update-enrollment.test.mjs | tooling integration (real script) | KEEP (follows script, owner) | MOVE to `test/tooling/` |
| test/own-notice-question.test.mjs | child-suite shim (T9) | DELETE | with `scripts/test-own-notice-question.ts` |
| test/own-provider-cancel-readback.test.mjs | transplant of `connection-ui.tsx` | DELETE | 2 assertions → `journeys/connection-cloud.spec.ts` |
| test/own-provider-host.test.mjs | integration over transplanted host fixture | KEEP + PORT fixture | MOVE to `test/integration/cloud-resident-host.test.mjs` |
| test/own-provider-service-restore.test.mjs | transplant + source-text | DELETE | 2 assertions → `journeys/connection-cloud.spec.ts` |
| test/own-provider.test.mjs | host-JVM of upstream Java + config text | DELETE | upstream follow-up; APK content check in `verify-apks` |

Totals: DELETE 14, KEEP 2, MERGE/REWRITE 10. Roughly 2,700 lines become about 700 lines, spread over 3 integration files, 2 android-jvm files, 1 tooling file and journey cases.

## Behaviours that lose all coverage if the DELETEs land without replacements
- Composer draft binding retired before paint on owner/history change (`notes-owner-retirement.test.mjs:118-125`). Check `composer-dispatch.spec.ts` first.
- Chat send not blocked by an unavailable optional view-command feed; an unknown VIEWS handoff becomes "That screen is not on this phone." (`optional-view-channel-chat`).
- Offline and signed out: zero network requests while speaking; the phone-call interruption status (`offline-signed-out-speech`).
- Cold start notice-owner fence resolves once; a revoked credential retires the owner with no retry timer (`notice-owner-startup`).
- Own provider with a saved Cloud sign-in restores services without switching provider; network return while signed out never calls Cloud (`own-provider-service-restore`).
- Cancel during Own-key validation never claims the key was saved (`own-provider-cancel-readback`). The host side stays in `own-provider-host`.
- Recorder controls: disabled while saving, Back saves, Copy text copies the whole transcript (`notes-recorder-controls`).
- Upstream-only coverage (NoticeOwnerCoordinator, the native provider slot, Cartesia transport, request leases, and the Notes validator schema compatibility) leaves this repo. It needs upstream tests (D14).

## Shared helpers worth keeping
- `specs/quint/refinement/services/notes-store/{module,fixture}.mjs`: used by the live canonical Notes refinement and by the merged Notes-store integration file. Load it once per file. The bundle is expensive.
- `test/fixtures/jvm-tools.mjs`: still needed by the android-jvm files.
- `test/fixtures/product-character-host.mjs`: keep, but PORT it to import `createCloudResidentHost`.
- After this chunk, `test/fixtures/notes-trash-read.mjs` has no importers (DELETE). `test/fixtures/child-suite.mjs` loses one importer. `test/own-provider/*.java` becomes orphaned (DELETE). `test/fixtures/browser-source.mjs` loses one importer.

## Cross-file actions
1. Delete the legacy Notes engine with `notes-owner-retirement`, `notes-pending-editor`, `notes-trash-read`, `test/fixtures/notes-trash-read.mjs`, `specs/quint/refinement/application/notes-trash-read-publication.mjs`, its `index.mjs` entries (lines 57 and 139) and the `NotesTrashReadPublication` model.
2. Create `test/integration/notes-store.test.mjs` from three files that share one `loadNotesSource()`.
3. Extract `notificationInstallation` and `rememberNotificationOwner` from `AlphaLocalAgentPlugin.java` into their own class, then port the two JVM tests so they compile it unsliced.
4. Delete `scripts/removed-profile-flags.ts` and its refusal copies (`verify-packaged-runtime.py`, `runtime-profile.ts`, `build-archive.ts`, Gradle), together with `one-runtime-profile.test.mjs`. Also remove the file from the name lists in `android-build-path.test.mjs` and `upstream-pin-guard.test.mjs`.
5. Delete `scripts/test-own-notice-question.ts` with its shim.
6. Add to `scripts/verify-apks.ts`: `CredentialRequestFence` is present in the dex, and the merged manifest declares the microphone foreground service for `AlphaNoteRecordingService`.
7. Delete the `connection-ui.tsx` migration of the stored `{kind:'offline'}` selection (A1), which is exposed by `notice-owner-startup`.
8. Rename the case "legacy Text-only edit" in `own-provider-host` (it tests the live API).

## Owner questions
- Should the upstream `plugin-notes` store integration tests (logical revision, lifecycle, replay identity) stay here as product integration tests, or move upstream?
- Keep `scripts/stage-os-update-enrollment.ts` (manual pilot OTA enrollment)? Its test follows it.
- Notes recorder live and Cloud transcription is still an open decision. Until it is settled, its recorder cases are kept.
