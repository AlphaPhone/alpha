# apps/app/src/browser/note-audio-store.ts
- Lines: 13 | Role: binds upstream Notes audio store to Alpha DB name and backstop retention | Verdict: SIMPLIFY
- Importers: 1 (voice.ts). Text/path pins: specs/quint/application/manifest.json; legacy notes-view refinement; notes-recorder-media-admission.mjs; 10 browser specs import `/src/browser/note-audio-store.ts`; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 9, 10 | A7 | `AudioRow`, `NOTES_AUDIO_BACKSTOP_MS`, `alphaAudioDatabase` exported with 0 references outside this file (git grep -w apps/test/specs). | Unexport (keep as consts). | None. |
| 2 | 12 | D4 | `export const audioMetadata=notesAudioMetadata` rename alias. | voice.ts imports `notesAudioMetadata` upstream directly. | None. |
| 3 | 13 | A1 | `migrateAudio` (used voice.ts:175,346) migrates older audio rows. | Delete with A1 if owner confirms no pre-rename data; voice.ts migrationStatus goes too. | Owner sign-off; note-audio-legacy-restore.spec.ts. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
5-line binding: create store, export the destructured functions used by voice.ts. Estimated lines after: 6 (current 13).

## Verification
browser-audio.spec.ts, note-audio-*.spec.ts, notes-trash*.spec.ts.
