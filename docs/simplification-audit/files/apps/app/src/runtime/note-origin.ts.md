# apps/app/src/runtime/note-origin.ts
- Lines: 39 | Role: re-exports upstream voice-note origin links and adds `voiceNoteContentRevision` / `voiceNoteChanged`. | Verdict: SIMPLIFY
- Importers: `prototype/note-origin-adapter.ts:3`, `prototype/voice-adapter.ts:16`, `runtime/calendar-form-draft.ts:1`.
- Text/path pins: `test/note-origin.test.mjs`, `test/native-secure-slots.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-24 | D4 | 15 renamed re-exports. Unused outside: `recordNoteOriginOf`, `RecordNoteOrigin` (0 src, 0 tests); test-only: `noteOriginLimit`, `findNoteOrigin`, `noteOriginKey`, `noteOriginOf`. | Callers import upstream directly; keep only Alpha's own functions here (or move them to the notes bindings module). | Low |
| 2 | 25-27, 35-39 | A1 | `voiceNoteChanged` also accepts the whole-record `recordingRevision` "for a link made before content revisions". | Delete the fallback (`&&await recordingRevision(note)!==revision`) after owner confirms no shipped build stored such links. | Medium |
| 3 | 32-33 | C3 | SHA-256→hex copy. | `sha256Hex(content)`. | None |
| 4 | 28,37 | C1 | `note:any`. | `NoteRecord` from `notes-store`. | Low |
| 5 | 6 | C7 | `recordingRevision` also re-exported by `prototype/summary-source.ts` — two import paths for one symbol. | Import from upstream in both. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| SHA-256 hex | helper | 32-33 | ~25 copies | `lib/hash.ts` |
| `voiceNoteContentRevision` | helper | 28 | none upstream | keep (notes bindings) |

## Proposed end state
~10 lines: `voiceNoteContentRevision(note:NoteRecord)` on `sha256Hex`, and `voiceNoteChanged` as a single comparison. No re-export list.

## Verification
`test/note-origin.test.mjs`, `test/native-secure-slots.test.mjs`, note-origin browser flows (voice note → calendar draft).
