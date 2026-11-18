# test/browser/notes-trash.spec.ts
- Lines: 293 | Kind: Playwright spec, chromium, 7 tests, fake clock; legacy Notes (`const openNotes=openLegacyNotes`), one test exposes a module-scoped executor by rewriting served `connection-ui.tsx` | Verdict: DELETE
- Covers: legacy Recently deleted: survives restart, restores same identity, Undo; Delete now/Empty confirm; checklists share Trash; 30-day purge exactly at the deadline; voice notes restore with recording and are erased at 30 days; an expired entry never erases a recording another note references; an agent deletion moves the recording to Trash; an open Trash cannot restore after the deadline. Duplicates: `canonical-notes.spec.ts` "canonical Notes UI creates, edits, trashes and restores the same committed identity", "canonical Trash dates the deletion…"; `notes-audio-journey.spec.ts` (voice delete + Undo). Callers/importers: none; imports `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 7 | A1 | Whole file drives the legacy source and its device-local Trash. Test 3 title: "canonical startup preserves unselected legacy Trash". | Delete. | Low (canonical twins exist) |
| 2 | 236-239 | T2-like | `page.route` appends `window.__notesTrashTestExecutor=(...args)=>deviceExecutor(...args)` to the served `connection-ui.tsx` to reach a module-private function. | n/a; nothing else should copy this seam. | None |
| 3 | 105-139 | T8 | Fake clock stepped across 30-day boundaries. | n/a. | None |

## Proposed end state
File deleted. The canonical Trash cases in `canonical-notes.spec.ts` become the Trash section of `journeys/notes.spec.ts`.
