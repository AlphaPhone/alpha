# test/browser/dev-workflow-triggers.spec.ts
- Lines: 43 (20 KB) | Kind: Playwright, chromium; simulator trigger runtime (time, message, email, Calendar, place, Device controls incoming), fake clock, 17 tests (~27 with loops) | Verdict: DELETE (owner decision tied to the `workflow-triggers` Lemma proof, D20)
- Covers: `browser/workflow-trigger-runtime.ts` + `browser/workflow-triggers.ts` fire simulator workflows from Home exactly once (cursor/queue), across reload and second tabs, with exact trigger input; storage-refusal recovery copy in several overlays. Duplicates: `specs/lemma/apps/app/src/browser/workflow-triggers.dfy` (Lemma proof of the cursor logic), `specs/quint/refinement/services/trigger-cursor-replay.mjs` (Quint replay). Callers: chromium only. Helpers: `helpers/legacy-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | P7 | Trigger runtime is imported only by `simulated-workflows.ts` (dev-only). | Delete with the simulator; per D20 delete `workflow-triggers.ts`, its Lemma proof and the Quint replay together, or keep all three. | Medium: owner decision Q-DEV-1; removes a proved module. |
| 2 | 5, 12-22 | T8 | 10 `page.clock` uses plus 4 `waitForTimeout` sleeps. | Gone. | None. |
| 3 | 9 | D2, P3 | `triggerApi` from a `Component.prototype.api` patch drives `setView('messages'|'inbox'|'workflows')`. | Gone. | None. |
| 4 | 17, 27, 36, 42 | P3 | `Storage.prototype.setItem` throws for simulator keys. | Gone. | None. |
| 5 | 18-19 | T6 | Calendar events and saved places seeded via `registerPlugin('AlphaCalendar')` and `new SavedPlaces().save` in-page. | Gone. | None. |
| 6 | 14 | A1 | Notes effect through the legacy store. | Breaks with A2. | — |

## Proposed end state
Deleted with the simulator. If the owner keeps the trigger runtime for its proof, keep one smoke case ("time trigger runs once from Home and not again after reload", line 12) in `journeys/workflows.spec.ts` and let the Lemma/Quint artefacts carry the rest.
