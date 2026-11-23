# test/browser/notes-photos-list-focus.spec.ts
- Lines: 138 | Kind: Playwright spec, chromium, 4 tests; canonical Notes and Photos UI, list updates pushed through a React-fiber walk, inputs hashed with `captureInputs` from the Quint refinement helpers | Verdict: REWRITE as steps in `journeys/notes.spec.ts` and `journeys/camera-photos.spec.ts`
- Covers: keyboard focus stays on the same logical row (by id, not element) when a Notes list re-renders (pin moves it, insert above), is not transferred when the focused note is removed or when focus is deliberately elsewhere; Photos keeps focus on an imported photo after readback and on a fixture item that moves date groups. Duplicates: `browser-list-focus.spec.ts`, `maps-list-focus.spec.ts` (same mechanism, other lists; research notes they share `check-traces.mjs`). Callers/importers: none. Nothing in `specs/quint` reads its JSON attachments (grep for the file name and "bounded-browser-observations" finds only this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11, 44-49 | B5, T1 | Hashes 17 source files (including `template.html`, `model.js` and the legacy `browser-notes-document.ts` and `notes-store.ts`) before and after each test and fails if any changed; writes an "evidence" JSON no consumer reads. Breaks on the legacy deletion and on any reformat. | Delete the hashing and the evidence file. | None |
| 2 | 13-24 | T6 | `shell()` walks `__reactFiber$` to call `vget/vset/renderVals().photos.libraryRetry()` and `canonicalNotesUi.refresh()`. | Push Notes changes through the canonical fixture (`state.notes=...` then the product's own refresh trigger, e.g. focus/visibility); push Photos changes through the photos bridge `emit()`. | Low |
| 3 | 25-43 | ok/T6 | `observe()` gathers a large focus snapshot; assertions use only `currentRow` and `toBeFocused`. | Keep `toBeFocused()` and one identity check; drop the snapshot. | None |
| 4 | 95-99 | T6 | Imports photos via `importBrowserPhoto` from `/src/prototype/browser-camera.ts`. | Use the camera fixture to take two photos, or the Photos import control. | Low |
| 5 | 123 | D5 | Fourth test uses `?mode=mock` fixture photos. | Use the photos bridge with two items whose dates change. | Low |

## Proposed end state
Two focus steps: in `journeys/notes.spec.ts`, focused note keeps focus across a pin and an insert, and loses it (no transfer) when removed; in `journeys/camera-photos.spec.ts`, focused photo keeps focus across a library refresh and a date-group move. Shared `expectFocusKept(locator)` helper with the browser and maps list-focus specs. No hashes, no fiber.
