# Chunk test-35: test fixtures (JVM stubs, Quint comparison aliases, refinement fixtures)

38 files reviewed, 38 reports in `files/test/fixtures/...`. Every file still exists in the worktree.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `note-recorder-jvm/**` (13 Java stubs: Context, MediaCodec, MediaExtractor, MediaFormat, MediaMuxer, MediaRecorder, Build, Handler, Looper, SystemClock, AtomicFile, JSArray, JSObject) | host-JVM Android stubs | KEEP | Move with the `AlphaNoteRecorder` JVM case (`test/notes-recorder.test.mjs:605-607` + `NoteRecorderJournalTest.java`) to its own integration file when `notes-recorder.test.mjs` is cut down |
| `reviewed-copies-jvm/**` (5 Java stubs: Context, Intent, Uri, ParcelFileDescriptor, FileProvider) | host-JVM stubs for a native refinement harness | KEEP | `specs/quint/refinement/native/reviewed-copies.mjs` compiles the real `ReviewedCopies`/`AlphaMailFileProvider` |
| `quint/ChatInputCurrentComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/chat-input` |
| `quint/FilesBrowserComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/files-browser` |
| `quint/HomeLayoutComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/home-layout` |
| `quint/MapsComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/maps` |
| `quint/NotesViewComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/notes-view` |
| `quint/PhotosLibraryComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/photos-library` |
| `quint/SettingsNavComparison.qnt` | legacy comparison alias | DELETE | with `specs/quint/legacy/settings-nav` |
| `notes-recorder-media.mjs` | in-page prototype-patching driver (T6) | PORT | Drive the dev test-mocks capture/playback ports and DOM instead of patching `NoteRecorderSession`/`BrowserVoice`/`BrowserAudioCapture` prototypes |
| `notes-trash-read.mjs` | transplant of `notes-trash-adapter.ts` (legacy source only) | DELETE | with legacy Notes (D1, delete-candidates A99) |
| `observed-sms-adapter.mjs` | real-module bundle + text-marker probe | PORT | Export `smsDraftSnapshot()` from `sms-adapter.ts`; drop the ` const sync=()=>{` splice |
| `photo-library-adapter.mjs` | integration test hiding in fixtures, spawned by `photo-library.test.mjs:242` | MOVE | `test/integration/photos-library-agent.test.mjs` (node:test, direct import) |
| `pilot-update.mjs` | scripted adb for release tooling | KEEP | used by `pilot-update-export.test.mjs` and `refinement/services/pilot-update.mjs` |
| `prepare-local-agent.mjs` | spawns real `prepare-local-agent.ts` in temp git repos | KEEP | survives via `refinement/services/prepared-source-stamp.mjs` |
| `prepared-worker-producer.mjs` | closed producer port | KEEP | import shared worker file list |
| `previous-notes-source-opening.mjs` | transplant (marker slice of `agent-adapter.ts`) of legacy "Previous Notes" | DELETE | with legacy Notes source (D1) |
| `product-character-host.mjs` | transplant of `scripts/cloud-resident-host.ts` in `vm` | PORT | add `root` option to exported `createCloudResidentHost`, import it |
| `reminder-open-intent.mjs` | transplant (two text markers + regex over `automations-adapter.ts`) | PORT | shared esbuild reminder bundle; export `openDeviceReminder` row handler |
| `resident-java-source-stage.mjs` | spawns real `stage-local-agent-sources.ts` with fs faults | KEEP | read rewrite anchor from the script instead of repeating the upstream literal |
| `retained-reminder-tap.mjs` | transplant (same slice as reminder-open-intent) | PORT | same shared reminder bundle |
| `scheduled-task-controls.mjs` | real-module esbuild bundle with ports | KEEP (simplify) | drop staged-vs-vendor byte assertion; the template for the reminder ports |

Totals: KEEP 23 (13 + 5 stubs, pilot-update, prepare-local-agent, prepared-worker-producer, resident-java-source-stage, scheduled-task-controls), DELETE 9 (7 Quint aliases, notes-trash-read, previous-notes-source-opening), PORT/MOVE 6 (notes-recorder-media, observed-sms-adapter, photo-library-adapter, product-character-host, reminder-open-intent, retained-reminder-tap).

## Coverage that would be lost by the DELETEs

- **Quint comparison aliases:** these replay the *current* Chat input, Files browser, Home layout, Maps, Notes view,
  Photos library and Settings navigation renderers against historical 2026-11 design models. Deleting them removes
  those historical comparisons. Current behaviour of each surface is still modelled by live application models
  (`ChatDock`, `FilesBrowserController`/`FilesTree`, `HomeSurface`, `Maps*`, `CanonicalNotesView`, `PhotosWindow`/`PhotosTrash`/`PhotoLibraryAgentReview`, `Settings*`). I have not checked trace by trace that each live harness drives the
  same actions, so treat this as plausible coverage, not proven.
- **notes-trash-read / previous-notes-source-opening:** they cover only legacy-source code that D1 deletes. Nothing
  is lost once the product code goes. One non-legacy behaviour is touched incidentally: canonical Notes retiring and
  re-reading on an owner change (`canonicalNotesKey`). It needs a step in `journeys/notes.spec.ts`: switch account,
  then the Notes list reloads for the new owner.
- **Not a DELETE, but at risk:** the host-JVM `AlphaNoteRecorder` journal case. It is the only PR-time coverage of
  torn-journal, missing-segment and pending-canonical-save recovery. It must survive the cleanup of
  `test/notes-recorder.test.mjs`, which is mostly source-text checks.

## Shared helpers worth keeping or creating

- `scheduled-task-controls.mjs` shows the target harness shape: esbuild-bundle the real adapter, inject ports at the
  import level and do no text slicing. The reminder fixtures and `observed-sms-adapter.mjs` should follow it.
- New `test/fixtures/reminder-adapter-bundle.mjs`, shared by `reminder-open-intent.mjs` and `retained-reminder-tap.mjs`.
  Those two contain the same slice/strip code with the same two markers in `reminder-creations.ts` (C5).
- One worker-artifact file list (`node_modules/smthrs|zod|effect|@smthrs/engine`, `dependencies.json`), now repeated in
  `prepared-worker-producer.mjs`, `product-character-host.mjs` and `workflow-worker-assets.mjs`.
- Local `git()`/`hash()`/`write()` helpers in `prepare-local-agent.mjs` and `resident-java-source-stage.mjs` should use
  the planned `scripts/lib` git and hash helpers.
- I decided not to merge the JVM stub trees. `note-recorder-jvm`, `reviewed-copies-jvm`, `app-update-jvm` and
  `secure-store-memory` declare the same Android classes with incompatible behaviour: an `AtomicFile` that is
  non-atomic in one tree, renames in another and injects corruption in the third; a `JSObject` built on `JSONObject`
  versus one built on a map; a full `Intent` model versus a single constant. A superset stub would couple three
  suites' fault knobs.

## Cross-file actions

1. Delete `test/fixtures/quint/` along with `specs/quint/legacy/*/check-*-refinement.mjs`, the `test/quint-legacy-*`
   tests and the `legacy` family in `scripts/check-quint.ts:42` / `scripts/quint-lib.ts:43`. Before that, move the
   helpers live harnesses import from `legacy/core` (ci-and-formal §2.10).
2. Delete `notes-trash-read.mjs` along with `test/notes-trash-read.test.mjs`,
   `specs/quint/refinement/application/notes-trash-read-publication.mjs`, its `application/index.mjs:57,139` entries,
   its model and `apps/app/src/prototype/notes-trash-adapter.ts`.
3. Delete `previous-notes-source-opening.mjs` along with `test/previous-notes-source-opening.test.mjs`,
   `refinement/application/previous-notes-source-opening.mjs` (`index.mjs:60,142`), its model and
   `prototype/legacy-notes-access.ts`.
4. Product exports needed by the PORTs:
   - `smsDraftSnapshot()` in `apps/app/src/prototype/sms-adapter.ts`
   - an exported device-reminder row handler in `automations-adapter.ts`
   - an optional `root` on `createCloudResidentHost` in `scripts/cloud-resident-host.ts`
   - a dev test-mocks capture/playback port for the Notes recorder
5. Replace `test/photo-library.test.mjs:242`, which spawns a second process, with the moved integration file.
6. Each per-model host test that only calls one refinement check is redundant with the family aggregate (T4). This
   covers `notes-recorder-media-admission`, `reminder-open-intent`, `retained-reminder-tap-admission`,
   `scheduled-task-controls`, `quint-resident-java-source-stage` and `quint-pilot-update-refinement`. Keep one runner.

## Owner questions

- `product-character-host.mjs` has six host-test importers. It stays only if the browser Cloud dev bridge
  (`scripts/browser-cloud-dev-bridge.ts` -> `cloud-resident-host.ts`) survives D5/D19. Does a retained e2e spec still
  drive it? If not, delete the fixture and all six tests together.
- Should the torn-journal / missing-segment / pending-save cases for `AlphaNoteRecorder` stay as a host-JVM
  integration test, or move to `NoteRecorderInstrumentedTest`? That instrumented test runs only on an emulator and
  not in PR CI. Moving them would let `note-recorder-jvm/` and `NoteRecorderJournalTest.java` be deleted.
- Is the historical design comparison (the legacy family) still wanted as evidence? D11 already says to retire it.
  Confirm, because the Maps comparison is the only check that asserts its six known mismatches.
