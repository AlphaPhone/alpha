# Chunk specs-30: application refinement harnesses (mounted-update … photos-trash)

24 files under `specs/quint/refinement/application/`. Per-file reports are in
`files/specs/quint/refinement/application/`.

## Files

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| mounted-update-admission.mjs | refinement, transplant (main.tsx, settings-adapter, upstream gate + injected inspector) | PORT | extract `prepareMountedUpdate` to an exported module; drop hash ceremony and `appUpdateResumePatch` tombstone |
| native-view-subscription.mjs | refinement, whole-file `sourceContext` | PORT (trivial) | `sourceModule('runtime/native-view-events.ts')` |
| note-source-dialog.mjs | ITF replay of deleted `note-source-adapter.ts` | DELETE | with test, `NoteSourceDialog.qnt`, manifest row |
| note-web-source-dialog.mjs | ITF replay of deleted `note-web-source-adapter.ts` | DELETE | with test, `NoteWebSourceDialog.qnt`, manifest row |
| notes-coordinator-notes.md | doc of legacy Notes coordinator | DELETE | and README.md:71 mention |
| notes-coordinator.mjs | transplant of legacy Notes `vset` (anchors already gone) | DELETE | with test, aggregate entry; remove `initLegacy` from `NotesLifecycle.qnt` |
| notes-document-transfer.mjs | ITF replay, real module import | KEEP | owner question on dev Notes import (D3) |
| notes-files-media-itf.mjs | shared replay/loader helper (10+ importers) | KEEP, MERGE | with `assistant-model-traces.mjs`, `browser-model-traces.mjs`, `support.mjs` into one `refinement/support/replay.mjs` |
| notes-recorder-media-admission.md | doc | MERGE | into the harness header comment (drop the history narrative) |
| notes-recorder-media-admission.mjs | refinement in real Chromium on the mounted app | KEEP | rename fixture `calendar-mounted-editor.mjs` → `mounted-app.mjs` |
| notes-trash-read-publication.mjs | legacy "Previous notes" Trash (adapter deleted) | DELETE | with `test/notes-trash-read.test.mjs`, `test/fixtures/notes-trash-read.mjs`, model, manifest row |
| observation-turn-dispatch.mjs | partial transplant of `connectionController.send` | PORT | export `sendTurn(deps,…)` when `connection-ui.tsx` is split |
| os-defaults-user-tiles.before.kt | vendored AOSP before-image (manifest-hash pinned) | KEEP | consider moving next to `core-launcher` patch |
| os-defaults.mjs | host-JVM refinement of AOSP QS defaults / appop grant | KEEP | D17 keeps the QS migration; move probes to files |
| os-host-support.mjs | Android stubs + javac helpers | KEEP, MERGE | JVM runners into `refinement/native/java.mjs` |
| os-provisioning.mjs | host-JVM refinement of AOSP Provision (3 observer injections) | KEEP | overlap with `test/aosp-fresh-presets.test.py` |
| os-source-staging.mjs | runs real Python staging with one injected observer | KEEP | Python probe as a file; callback instead of injection |
| own-notice-question.mjs | trace replay, two-file transplant | PORT (easy) | `loadProductModule('prototype/own-notice-question.ts')` |
| password-provider-dialog.mjs | trace replay, real module import | KEEP | path change when dev simulator moves to `dev/` |
| pending-action-recovery.mjs | trace replay, anchor slice of `agent-adapter.ts` | PORT | extract `recoverPendingActions`/`proposalCard` into a module |
| permission-choices.mjs | real React component in JSDOM + 2 text injections + hook-index peeking | PORT + SIMPLIFY | delete historical-version schedules and `s.legacyCompleted` (product already dropped versions 2/3) |
| permission-coordinator-notes.md | doc (stale counts, historical steps) | MERGE | into `permission-choices.mjs` header |
| photos-owned-album-dialog.mjs | refinement over bundled `camera-adapter.ts` | KEEP | delete duplicate example tests in the wrapper |
| photos-trash.md | doc | MERGE | into `photos-trash.mjs` header (drop changelog) |

Totals: KEEP 9 (incl. 2 KEEP+MERGE helpers), PORT 6, DELETE 5, MERGE (docs) 3, plus permission-choices PORT+SIMPLIFY counted under PORT.

## Currently broken in this worktree

- `notes-coordinator.mjs`, `note-source-dialog.mjs`, `note-web-source-dialog.mjs`, `notes-trash-read-publication.mjs`:
  their product sources were deleted by stage A, so their tests and the application aggregate fail until they are deleted.
- `permission-choices.mjs`: the native historical-completion schedules (`returning-auth-preserves-completed-4/5/6`)
  no longer match `startup-permission-progress.ts` (native now only accepts version 4). Fix the harness and
  `PermissionChoices.qnt` (`legacyCompleted`) together.

## Behaviours that would lose all coverage if the DELETEs happen

- None for live product code. All four DELETE harnesses model deleted code.
- Gap to check: canonical Notes Trash (`runtime/notes-trash.ts`) and the `SecureNotesStore` uncertain-commit/draft
  retention still used by canonical Notes had their only refinement through the legacy paths. A `journeys/notes.spec.ts`
  case (delete → Trash → restore; edit under storage failure → reopen) should exist before claiming coverage.
- The app-update freeze (`mounted-update-admission`) and observation turn dispatch have no Playwright coverage; the
  harnesses stay their only coverage, so the ports have to keep all schedules.

## Shared helpers worth keeping

- `notes-files-media-itf.mjs` `loadProductModule` (esbuild bundle + stubs + `rewrite` for mutation tests): the single
  loader every PORT should use.
- `os-host-support.mjs` Android stubs (move them to real `.java` files shared with native harnesses).
- One replay engine: merge `notes-files-media-itf.mjs`, `../assistant-model-traces.mjs`, `browser-model-traces.mjs`
  (three copies of `plain` / `modelTraces` / `replayTraces`) and `support.mjs` (`sourceContext`, `bundledSource`,
  `memoryStore`, `deferred`, `tick`).

## Cross-file actions

1. Delete with their tests/models/manifest rows: NoteSourceDialog, NoteWebSourceDialog, NotesTrashReadPublication,
   the legacy half of NotesLifecycle (`initLegacy`), the `notes-coordinator` aggregate entry, README.md:71 mention.
2. Product extractions that unblock ports: `prepareMountedUpdate` out of `main.tsx`; `sendTurn` out of
   `connection-ui.tsx`; `recoverPendingActions` + `proposalCard` out of `agent-adapter.ts`.
3. Each model runs from one test entry: per-model wrapper or family aggregate (`index.mjs`), not both (T4).
4. Remove the B5 hashing of non-executed inputs (index.mjs, wrapper tests, package-lock, scripts) in every harness here;
   `test/quint-os-application-refinement.test.mjs` asserts those paths and must change with it.
5. Delete the duplicate host tests: `test/own-notice-question.test.mjs` + `scripts/test-own-notice-question.ts`, the
   example tests in `test/quint-photos-owned-album.test.mjs`, and choose between `pending-action-recovery.mjs` and
   `test/pending-action-background-recovery.test.mjs`; between `os-provisioning.mjs` and the overlapping cases in
   `test/aosp-fresh-presets.test.py`.
6. Path-filter lanes: OS harnesses need JDK + Kotlin + python3 and should run only on `android/aosp/branding/**`,
   `scripts/stage-alpha-os-branding.py` and their harness files; the recorder harness starts Vite + Chromium.

## Owner questions

1. Is the test-mocks-only Notes "Import text file" covered by D3 (import/export deleted)? If yes, the import half of
   `NotesDocumentTransfer.qnt` and `saveImportedNote` go.
2. Do all supported agents report `userTextFormatVersion: 1`? If yes, the `legacy` wire format (alphaPhone context
   envelope) in `connection-ui.tsx` is a dead reader and three observation-dispatch schedules go.
3. Mounted-update port: accept dropping four private fields from the MountedUpdateAdmission projection, or request an
   upstream read-only inspector on `app-update-gate.ts` (D14)?
4. `os-defaults-user-tiles.before.kt` has no licence header; confirm the pinned AOSP blob matches or add a NOTICE.
