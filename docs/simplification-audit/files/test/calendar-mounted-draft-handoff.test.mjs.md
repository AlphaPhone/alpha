# test/calendar-mounted-draft-handoff.test.mjs
- Lines: 65 | Kind: e2e inside `node:test` (launches Chromium through `test/fixtures/calendar-draft-handoff.mjs` → `calendar-mounted-editor.mjs`; reads state through the `window.quintCalendar` backdoor) | Verdict: DELETE (T4)
- Covers: a refused Note → event and Camera scan → event handoff keeps the initiating view and the earlier retained Calendar draft until explicit discard. Duplicates: `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs` (run by `test/quint-canonical-calendar-draft-handoff.test.mjs`) drives the same fixture with the same schedules: "Note refusal keeps exact note and separate reminder authority" (line 109) and "Camera refusal keeps the real review and admits fresh draft after discard" (line 120), plus three more. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Same scenarios as the Quint refinement replay on the same fixture. | Delete. | None |
| 2 | 7 | T8 | 240 s timeout; Chromium start inside the host suite (tests-host research item 20). | Gone. | - |
| 3 | 15-18 | T6 | `waitForFunction` on `window.quintCalendar.snapshot()` backdoor. | Journey uses visible state only. | - |

## Proposed end state
Deleted. Coverage remains in the Quint replay. `test/fixtures/calendar-draft-handoff.mjs` and
`calendar-mounted-editor.mjs` survive: the Quint harnesses `canonical-calendar-draft-handoff.mjs`,
`canonical-calendar-editor-close.mjs`, `camera-preview-retirement.mjs` and `notes-recorder-media-admission.mjs` import them.
