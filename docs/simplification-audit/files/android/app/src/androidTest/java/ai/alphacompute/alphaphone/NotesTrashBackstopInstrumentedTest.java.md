# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NotesTrashBackstopInstrumentedTest.java
- Lines: 295 | Role: native Notes Trash expiry sweep (`AlphaNoteAudioPlugin.sweepExpiredTrash`) and interrupted permanent voice deletion pass (`finishPermanentDeletions`) on the real encrypted store and recording files | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Calls package-private `AlphaNoteAudioPlugin.sweepExpiredTrash`, `finishPermanentDeletions`, `trashEntrySpans`, `pendingMemberSpans`, `NOTES_TRASH_SLOT`, `NOTES_SLOT`, `PENDING_AUDIO_SLOT`.
  Text/path pins: `scripts/android-instrumentation.ts:185` (`NotesTrashBackstop: {}`); comment in `test/browser/notes-permanent-delete-backstop.spec.ts:9`. `test/notes-deletion-lease.test.mjs:17` slices `AlphaNoteAudioPlugin.java` between `static int finishPermanentDeletions(` and `static List<String> trashEntrySpans(` (pins the production file, not this one).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-53 vs 159-164 | C3 | `notes(String... audioIds)` and `savedNotes(collection,tombstones,extra...)` both write the `{currentRaw:{version:2,collectionId,records:[backstop-live…],deleted}}` envelope. `notes(ids)` == `savedNotes("backstop",new JSONArray(),voiceNote("backstop-live-"+id,id)…)` except for the "Shares" title. | Delete `notes`; call `savedNotes("backstop", new JSONArray(), …)` (titles are not asserted). | Low. |
| 2 | 37-42 vs 167-170 | C3 | `recording(...)` and `liveRecording(...)` both write `<id>.audio` "synthetic" bytes and a `note-audio-metadata:v1:<id>` record; they differ only by deletion fields. | One `recording(audioId,noteId,JSONObject deletion /*nullable*/)`. | Low. |
| 3 | 93-94, 287-293 | D7 | Direct assertions on `trashEntrySpans` / `pendingMemberSpans` (package-private span splitters). They exist in main only as helpers of the sweep; testing them directly keeps them package-visible. | Keep for now (only coverage of the top-level-only split rule); if the splitters move to a shared JSON utility, assert there. | Low. |
| 4 | 26, 41, 71, 114, 123, 129, 145, 169, 171, 242, 246 | C6 | Literal `"note-audio-metadata:v1:"` prefix repeated 11 times; production owns the prefix in `AlphaNoteAudioPlugin`. | Expose `AlphaNoteAudioPlugin.METADATA_PREFIX` (or a `metadataSlot(id)` helper) and use it. | None. |
| 5 | 271-286 | KEEP | The `catch(JSONException refused)` branch documents a measured store behaviour (unparseable writes refused); it is the specified behaviour. | Keep. | — |
| 6 | 44-47, 150-154 | KEEP | Hand-built JSON strings intentionally match `JSON.stringify` byte order (the sweep copies bytes verbatim). | Keep. | — |
| 7 | 25-35 | KEEP | @Before/@After save/restore of exactly the touched slots; correct and minimal. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DAY` | const | 25 | `NotesTrashPolicy`-style constants in main? (none exported) | keep |
| `audioDir` | helper | 36 | `NoteAudio*InstrumentedTest` use the same `note-audio` dir literal | `AlphaNoteAudioPlugin.audioDir(context)` if exposed |
| `recording` / `liveRecording` | helper | 37-42, 167-170 | each other | merge (finding 2) |
| `entry` / `pendingRow` | helper | 44-47, 150-154 | none | keep |
| `notes` / `savedNotes` | helper | 48-53, 159-164 | each other | merge (finding 1) |
| `tombstone`, `voiceNote`, `pending`, `pendingRaw`, `metadataRaw`, `bytesExist` | helper | 155-172 | none | keep |

## Proposed end state
Same nine tests; one envelope writer, one recording writer, the metadata-slot prefix taken from production.
Estimated 295 → ~280 lines (the file's value is its cases; it is the only device coverage of the backstop).

## Verification
`npm run test:android:instrumentation -- --classes NotesTrashBackstop` (ungated); host
`node --test test/notes-deletion-lease.test.mjs`; browser `test/browser/notes-permanent-delete-backstop.spec.ts`.
