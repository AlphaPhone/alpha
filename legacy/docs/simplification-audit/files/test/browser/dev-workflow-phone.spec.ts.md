# test/browser/dev-workflow-phone.spec.ts
- Lines: 16 (11 KB) | Kind: Playwright, chromium; product workflow approval UI (Approve / Deny / Cancel run) against the development agent workflow protocol | Verdict: MERGE into `journeys/workflows.spec.ts`
- Covers: an agent workflow's phone step waits for approval; Approve → Confirm writes exactly one note and a resumed run does not repeat it; Deny ends the run without a write; Cancel blocks a pending proposal; approved reads (notes/calendar/reminders) continue into a separately approved write. Duplicates: `workflow-scope-refusal.spec.ts`, `workflow-outcome-unknown.spec.ts` (approval refusal paths). Callers: chromium only. Helpers: `connection-diagnostics.ts`, `helpers/legacy-notes.ts`, `workflow-navigation.ts`, `calendar-draft-readiness.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | — | Approve-once, Deny, Cancel through visible buttons: the core AP-11 approval journey in the renderer. | Carry (one profile, not the `write`/`cloud` loop). | None. |
| 2 | 14 | T7 | Loop over notes/calendar/reminders reads. | Keep one (notes or calendar). | Low. |
| 3 | 8-9 | A1 | Seeds `alphaphone:notes:v2` and counts results via `readBrowserNotesRaw` (legacy Notes, A2). | Re-point the note destination at canonical Notes or assert in the rendered Notes list. | Medium: this file breaks when A2 lands. |
| 4 | 15 | A1 | "legacy waiting runs recover their existing proposal identity" deletes `proposalIds` from stored runs to fake an old format. | Delete (D1). | None. |
| 5 | 16 | P3, T6 | Patches `IDBObjectStore.prototype.put` and parses three nested JSON layers of `alpha.browser.execution.local.v1`. | Delete. | Low. |
| 6 | 10 | — | `cloud` profile variant: depends on whether the development Cloud profile survives D5/D19. | Drop the variant. | None. |

## Proposed end state
Three cases in `journeys/workflows.spec.ts`: Approve once (no duplicate after resume), Deny ends without a write, Cancel blocks the pending proposal; plus one approved read continuing into an approved write. Notes destination on canonical Notes.
