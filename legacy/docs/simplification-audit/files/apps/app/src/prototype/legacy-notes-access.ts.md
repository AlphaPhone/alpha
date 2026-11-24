# apps/app/src/prototype/legacy-notes-access.ts
- Lines: 62 | Role: "Previous notes" access path – probes for and opens pre-canonical notes stores (browser document port or Android secure vault) read-only, refusing any write. | Verdict: DELETE (owner decision; strong)
- Importers: `apps/app/src/prototype/agent-adapter.ts:9` (only importer; uses `openExistingBrowserNotes, openExistingDeviceNotes, LegacyNotesAbsent, LegacyNotesDraftOnly, browserPreviousNotesAvailability, devicePreviousNotesAvailability` at :577-616 and :1326).
  Text/path pins: `specs/quint/application/manifest.json:289,3556,3592`, `specs/quint/refinement/application/previous-notes-availability.mjs:10,14-15` (slices agent-adapter between `  function previousNotesOwnerKey(` and `  async function previousNotesObservation(`), `test/fixtures/previous-notes-source-opening.mjs:9,25-26`, `test/native-secure-slots.test.mjs:86-87` (regex on `port:NotesDocumentPort` and `SecureNotesStore\.open\(guarded`), `test/notes-owner-retirement.test.mjs:30-75` (loads it), `test/support/feature-parity.mjs:380`, browser `test/browser/legacy-notes-access.spec.ts`, `test/previous-notes-source-opening.test.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-62 | A1 | Whole module reads data that cannot exist in the renamed package: "Nothing was ever saved as previous notes on this phone" (:9). Canonical notes are the default (`agent-adapter.ts:772`); the package `ai.alphacompute.alphaphone` started 2026-11-09 with empty private data; README/PRD plan no migration (research app-prototype P10). | Delete the file together with: the "Previous notes" source switch and `notesSourceOptions` (`agent-adapter.ts:1325-1331`), the legacy `vset` notes path (`agent-adapter.ts:1267-1322`), the availability probe (`:577-616`), `notesSourceMode` branches in ~10 adapters, legacy instance fields, `LEGACY_NOTES_SOURCE_KEYS` in `runtime/notes-secure-store.ts:14` if no other reader, and the tests/specs/manifest entries listed above. | High scope (≈400-600 lines across 12 files); needs owner sign-off that no device carries old-package data the new package must read |
| 2 | 20, 36, 45 | C3 | Same `check` closure (`signal.throwIfAborted();if(!current())throw new DOMException('Notes source changed.','AbortError');`) written three times. | Moot if deleted; otherwise one `fence(signal,current)` helper. | None |
| 3 | 23 | B1 | `catch(error){check();return 'unavailable';}` maps any failure to "unavailable". | Moot if deleted. | — |
| 4 | 6-8 | A7 | `LegacyNotesReviewRequired` is only used inside this file (not imported by agent-adapter). | Moot if deleted; otherwise un-export. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `LegacyNotesReviewRequired/Absent/DraftOnly` | classes | 6-15 | none | delete |
| `LegacyNotesAvailability` | type | 16 | `shell.previousNotesAvailability` field in agent-adapter | delete |
| `noLegacyKeys` | helper | 17 | `LEGACY_NOTES_SOURCE_KEYS` reader | delete |
| `check` (×3) | helper | 20, 36, 45 | abort/staleness fences everywhere (research P15) | delete |

## Proposed end state
File removed (0 lines). agent-adapter opens only the canonical notes store; the Notes view has no source chooser.

## Verification
Remove/adjust `test/notes-owner-retirement.test.mjs`, `test/native-secure-slots.test.mjs:86-87`, `test/previous-notes-source-opening.test.mjs` + fixture, `test/browser/legacy-notes-access.spec.ts`, the quint `previous-notes-availability` replay and its manifest entries, `feature-parity.mjs:380`. Re-run notes browser journeys (`notes-*.spec.ts`), `npm run verify`, Android build (both variants).
