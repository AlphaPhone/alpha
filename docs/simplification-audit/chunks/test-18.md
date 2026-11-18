# Chunk test-18: Playwright specs, native speech/video, Notes, notifications

30 files reviewed, 30 reports under `files/test/browser/`. The main finding: 19 of the 30 drive legacy Notes ("Previous/Older notes", `runtime/browser-notes-document.ts`, `helpers/legacy-notes.ts`) or legacy storage readers, so they go with D1. The canonical Notes specs that are left are good journeys.

| File | Kind | Verdict | Target |
|---|---|---|---|
| native-speech.production.spec.ts | production, UI + fiber walks + 1 transplant | MERGE (drop Maps transplant and legacy Notes cases) | `journeys/voice.spec.ts` (production project) |
| native-video-library-change.spec.ts | chromium, UI over bridge fake | MERGE | `journeys/camera-photos.spec.ts` |
| note-audio-delete-recovery.spec.ts | storage lane, legacy Notes | DELETE | |
| note-audio-legacy-restore.spec.ts | chromium, legacy audio rows | DELETE | |
| note-audio-lifecycle.spec.ts | module-in-page (T6), legacy migration | REWRITE 2 cases, delete rest | `journeys/notes.spec.ts` |
| note-audio-native-fence.spec.ts | legacy UI + module-only store tests | DELETE | |
| note-calendar-handoff.spec.ts | 4 legacy tests + 1 canonical | MERGE canonical test, DELETE 4 | `journeys/notes.spec.ts` |
| note-read-aloud.spec.ts | legacy + module entry | DELETE (toolbar check moves) | `journeys/notes.spec.ts` |
| note-source.spec.ts | legacy | DELETE (rewrite if canonical keeps sources) | |
| notes-audio-journey.spec.ts | storage lane, canonical UI | MERGE | `journeys/notes.spec.ts` (cross-browser) |
| notes-browser-segments.spec.ts | module-in-page, real sleeps | DELETE | |
| notes-document-receipt.spec.ts | legacy import/share | DELETE | |
| notes-document-storage.spec.ts | storage lane, legacy store | DELETE | |
| notes-named-review.spec.ts | transplant, duplicate | DELETE | |
| notes-pending-save.spec.ts | legacy | DELETE | |
| notes-permanent-delete-backstop.spec.ts | legacy, served-module rewrite | DELETE | |
| notes-permission-recovery.spec.ts | canonical UI | MERGE | `journeys/notes.spec.ts` |
| notes-photos-list-focus.spec.ts | canonical UI + fiber + source hashes | REWRITE | `journeys/notes.spec.ts`, `journeys/camera-photos.spec.ts` |
| notes-query-review.spec.ts | transplant, duplicate | DELETE | |
| notes-responsive.production.spec.ts | production, legacy | REWRITE | `journeys/notes.spec.ts` (chromium) |
| notes-review.spec.ts | module in a stub page (T6) | REWRITE (or DELETE if executor is legacy) | `journeys/notes.spec.ts` |
| notes-save-failure.spec.ts | storage lane, legacy + backup | DELETE | |
| notes-status-layout.spec.ts | legacy, 6 variants | DELETE | |
| notes-trash-full.spec.ts | legacy Trash | DELETE | |
| notes-trash-recovery.spec.ts | legacy Trash, 10 tests | DELETE | |
| notes-trash-resume.spec.ts | legacy Trash | DELETE | |
| notes-trash.spec.ts | legacy Trash | DELETE | |
| notification-action-lifecycle.spec.ts | module-in-page | REWRITE as 1 step (or DELETE) | `journeys/notifications.spec.ts` |
| notification-route-lifecycle.spec.ts | module-in-page; hosted half | DELETE hosted half, REWRITE calendar half as 1 step | `journeys/notifications.spec.ts` |
| notification-storage-migration.spec.ts | storage lane, legacy import/backup | DELETE (carry 1 case) | `journeys/notifications.spec.ts` |

Totals: 19 DELETE, 6 MERGE (counting partial merges), 5 REWRITE, 0 plain KEEP.

## Behaviours that lose all coverage if the DELETEs land

These need a canonical, integration or journey replacement, or an owner decision that they no longer apply:
- **Voice-note deletion with a lost audio or Notes reply** (note-audio-delete-recovery). This has only a legacy test. Canonical Notes has lost-save reconciliation but no lost-delete case.
- **Crash recovery of a permanent voice-note deletion** on the browser build (notes-permanent-delete-backstop, notes-trash-recovery). The Android native backstop instrumentation test still exists. Whether canonical Notes has this requirement is an owner question.
- **Bounded deletion-receipt history and old-restore/new-delete fence** in `note-audio-store.ts` (note-audio-native-fence tests 2-3). If the store survives the legacy deletion, this belongs in a Quint model.
- **"Editing or leaving a note stops read-aloud"** (note-read-aloud, native-speech Notes cases). Canonical Notes has no test, and the only entry point is module calls.
- **Offline on-device read-aloud** in the production bundle (native-speech offline test, second half).
- **Linked source document fingerprint and mismatch refusal** (note-source). `canonical-notes-ui.ts:19` still lists `documentSource`.
- **Toast deferred until the page is visible again** (notes-document-receipt). The mechanism is in the toast layer, but the only test is on legacy Notes.
- **Notes→Calendar link fails closed for a deleted note; double activation makes one draft** (note-calendar-handoff tests 1-4). Carry both cases into the canonical step.
- **Browser audio capture segmenting** (notes-browser-segments).
- **Cross-tab notification writes merge without loss** (notification-storage-migration test 2). Carry it.
- **Cross-engine (firefox/webkit) coverage of canonical failed save.** The cross-engine runs came only from the legacy `notes-save-failure`. Add the canonical failed-save step to the cross-browser lane.

## Shared helpers worth keeping
- `helpers/canonical-notes.ts` (`canonicalNotesFixture`, `openCanonicalNotes`) is the base of the notes journey.
- `helpers/photos-bridge.ts`: extend with a `videoEdit:'held'` option (native-video-library-change) and an `emit()`-driven readback (list focus).
- `native-speech-fixture.ts` + `flag-off-android.ts` for the production voice lane. Move `utterance()` into the fixture.
- New shared options proposed in this chunk: a synthetic `microphone` (it has 3 copies in this chunk), `permissions` (microphone/camera state + request counter), and `expectFocusKept` (shared with browser/maps list-focus specs).
- `helpers/legacy-notes.ts` and `helpers/native-notes.ts` (`openRetainedNativeNotes`) have no surviving importer from this chunk. Their other importers (about 56 legacy-notes users repo-wide, and `document-summary-note.production.spec.ts` for native-notes) need the same check in other chunks.

## Cross-file actions
- `scripts/storage-specs.ts`: remove lines 8, 24, 25 and 27 (notification-storage-migration, notes-document-storage, notes-save-failure, note-audio-delete-recovery). Keep 26 (notes-audio-journey) until it moves into the journey.
- `test/support/strip-types.mjs`: this chunk has three importers (notes-named-review, notes-query-review, the native-speech Maps case), and all three go. Check for other importers before deleting it.
- The served-module regex rewrite of `notes-trash-policy.ts` (`NOTES_TRASH_MAX_ENTRIES/BYTES`) appears in 3 specs here and goes with them. The `connection-ui.tsx` executor-exposure rewrite (notes-trash) also goes.
- `notes-photos-list-focus.spec.ts` hashes `runtime/browser-notes-document.ts` and `runtime/notes-store.ts`. It will fail as soon as stage A2 deletes them, so rewrite it in the same change.
- Formal: `specs/quint/refinement/application/notes-trash-read-publication.mjs` and `list-focus.mjs` reference the Notes trash and list-focus code. The formal reviewer must confirm whether the trash model covers legacy-only code (D20/D11). Nothing in `specs/quint` reads the evidence JSON that notes-photos-list-focus writes.
- Product deletes implied: the legacy reader in `browser/notification-store.ts:10-11`, the Web-Locks-absent fallback, `migrateAudio`/`migrationStatus` in `browser/voice.ts:175,346` and `note-audio-store.ts`, and `browser/hosted-results.ts` (if D5 covers it).

## Owner questions
1. Does canonical Notes keep **read-aloud**? Today it is reachable only through module functions or by asking Alpha. If it stays, which user path should the journey drive?
2. Is the **Notes→Calendar scheduling contract** (`reviewNoteScheduleContract`, "programmatic entry; no scheduling menu control") still a user feature? No visible control reaches it.
3. Do canonical notes keep **linked source documents** (`documentSource` in `canonical-notes-ui.ts`)?
4. Does `agent-adapter.ts:1050` `executeNotesQuery(this.notesStore, …)` act on the canonical or the legacy store? This decides whether `notes-review.spec.ts` is rewritten or deleted.
5. Do **hosted workflow results** (`browser/hosted-results.ts`) stay? This decides the hosted half of notification-route-lifecycle.
6. Does the browser build of canonical Notes need **crash recovery for a permanent voice deletion**, or is that only the Android native backstop?
7. Should the production lane keep a Notes check? The canonical fixture preloads `/src` modules and cannot run against the production bundle.
