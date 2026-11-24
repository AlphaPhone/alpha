# test/browser/canonical-notes-design.spec.ts
- Lines: 184 | Kind: Playwright, `chromium` project, UI journey plus geometry comparison against mock mode (`?mode=mock&start=notes`) | Verdict: **MERGE** into `journeys/notes.spec.ts` (list, editor, voice-note steps) and `journeys/accessibility.spec.ts` (300 % text); drop the mock-parity comparison
- Covers: agent-backed Notes render typed cards (voice duration, link domain, checklist preview, plain text for an empty voice record), Pinned first in one column, header holds Back / Record / New note only, the editor More menu holds exactly Share/Pin-Unpin/Delete and sits under the header, checklist toggles save, voice transcript lines are selectable text with Copy text and no Play for audio-less notes, Recently deleted is restore-only, and the list fits at 300 % text. Duplicates: trash restore in `canonical-notes.spec.ts:93` and `notes-trash*.spec.ts`; checklist toggle in `canonical-notes.spec.ts:231`; 300 % text in `accessibility-sweep*.spec.ts`. Callers/importers: none. Helpers: `helpers/canonical-notes.ts`, `accessibility-states.ts` (`setTextScale`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-44, 47-54, 164-165 | T6, P7 | `layout()` measures header actions and cards in mock mode and then asserts the live view is pixel-equal (`toEqual(mock)`). Mock mode is a developer surface (D6); this ties the product view to a simulator rendering. | Drop the mock reference and the equality. Assert the live header's three buttons, their 44 px size and one column directly (already done in lines 57-64). | Low: if the owner wants a visual-parity guard, use one `toHaveScreenshot` of the live list instead. |
| 2 | 10, 32 | B5 | Screenshots go to a fixed folder `test-results/notes-restore` (not `outputPath`) for "side-by-side review"; nothing compares them, and parallel workers overwrite each other. | Drop. | none |
| 3 | 5-9, 59, 70 | A8 | Comments cite decisions "P2, N2", `canonical-notes-ui.ts, template.html`, and describe "Previous notes is a quiet text action", which D1 deletes. | Drop on move. | none |
| 4 | 71-74, 116-117, 128-129 | none | `data-agent-id` lists pin the ids the agent uses to act on the Notes UI. This is a real contract with the agent, but exact sorted lists break on every new control. | Keep one `arrayContaining` check per screen (list, editor, voice) in the journey. | Low. |
| 5 | 77-80 | A1 | Asserts "Previous notes" and folder controls are absent. After D1 deletes the legacy source mode the "Previous notes" assertion is vacuous. | Drop "Previous notes"; keep "no Recently deleted chip when Trash is empty". | none |
| 6 | 84-139 | T7 | One test walks list (dark), text editor, More menu, checklist, voice note and its menu. It is a journey already. | Move as the notes journey's "typed cards and editors" test; theme as a project/fixture parameter rather than a second copy. | Low. |
| 7 | 162-184 | T4 | 300 % text overflow walk over Notes list buttons duplicates the generic clipping rule in the accessibility sweep. | Ensure the sweep's state catalogue includes "Notes list with typed cards"; delete this test. | Low. |

## Proposed end state
`journeys/notes.spec.ts` gains one "typed cards, editors and note actions" test seeded with these six records: card
contents, Pinned order, header controls, More menu contents and placement, checklist toggle persisted, voice transcript
selectable, one `data-agent-id` containment check per screen. The accessibility sweep covers 300 % text. No mock-mode
comparison, no fixed-path screenshots. Delete this file.
