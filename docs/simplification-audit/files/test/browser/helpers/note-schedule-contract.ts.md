# test/browser/helpers/note-schedule-contract.ts
- Lines: 22 | Kind: Playwright source rewrite (intercepts `/src/main.tsx` and injects a global hook into the transformed module) | Verdict: **DELETE**; owner question on the feature
- Covers: calls the Notes view's `toEvent`/`toCal` actions (note → event/reminder draft review) after the owner removed their menu controls. Duplicates: none. Callers/importers: `note-calendar-handoff.spec.ts` (7 calls), `journey-b-voice-note-actions.spec.ts` (2), `journey-core-loops.production.spec.ts` (installs it in `beforeEach`, never calls `reviewNoteScheduleContract`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-17 | T2/P4, T6 | Rewrites the served product module at the text anchor `let shell;` (only present after Vite strips the `: any` from `main.tsx:219`) to expose `globalThis.__noteScheduleContract`. A third build of the product; any rename or reformat breaks it. | Delete. If the behaviour stays, the product needs a visible entry point and the journey clicks it. | Medium: this is the only coverage of `scheduleDraft` from Notes. |
| 2 | 23 (caller) | A7 | `journey-core-loops.production.spec.ts:23` installs the route but the production bundle never requests `/src/main.tsx`, and the spec never calls the hook: dead setup on every test. | Remove the import and `beforeEach` there. | none |
| 3 | 3-4 | A5 | Its comment says the controls were removed. Then `toEvent`/`toCal` in `canonical-notes-ui.ts:308-315` are reachable only through this hook (and voice paths in `voice-adapter.ts`). | Owner question: restore the controls or delete the Notes-side scheduling actions. | — |

## Proposed end state
File deleted. Either the product shows "Review event / Review reminder" again and `journeys/notes.spec.ts` clicks it, or the
Notes scheduling actions are deleted with their specs. `journey-core-loops.production` loses the dead `beforeEach`.
