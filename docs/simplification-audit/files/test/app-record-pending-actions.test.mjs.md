# test/app-record-pending-actions.test.mjs
- Lines: 62 | Kind: source transplant (slices `connection-ui.tsx` between `export function residentPendingText(` and `/** The send/voice refusal`, all of `canonical-notes-ui.ts`, and `agent-adapter.ts` between `function canonicalNotesKey(` and `async function previousNotesObservation(`; evaluated with `new Function` and stub classes) | Verdict: DELETE; carry the cases to `journeys/notes.spec.ts`
- Covers: New Note while the agent is starting/recovering/offline shows the right message without placeholder or draft mutation; a Notes recovery error stays visible; an available canonical binding creates normally; the binding follows the app-record port; Review event from an agent note goes through Calendar admission. Duplicates: `test/canonical-notes-webview-abort.test.mjs`, `test/notes-view-defaults.test.mjs`, `test/scanned-calendar-handoff.test.mjs` (same modules, other slices); `test/browser/connection-startup-presentation.spec.ts` (pending text). Callers/importers: `npm test`; imports `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-9 | T2 | Slices and type-strips product files; any rename or reformat breaks it. | Delete. | none |
| 2 | 40 | T2, A1 | End marker is `previousNotesObservation`, the legacy "previous notes" path that D1/A2 deletes: the test breaks when that legacy code goes. | Delete with the legacy code. | none |
| 3 | 13-21 | T3 | Fakes the notes controller, editor, shell and view; only the glue is real. | n/a | - |

Cases worth carrying to `journeys/notes.spec.ts` (with the agent connection held in starting / recovering / offline):
1. New note shows "starting" quietly, "stopped" or "Agent offline", leaves the list and draft unchanged.
2. A Notes recovery error message is shown and reused by the attempted action.
3. Review event from an agent note opens Calendar review with the note link; when Calendar is busy nothing else opens.

## Proposed end state
File removed. Three journey steps in `journeys/notes.spec.ts` using the shared harness's connection-state fixture.
