# test/calendar-mounted-editor.test.mjs
- Lines: 63 | Kind: e2e inside `node:test` (Chromium via `test/fixtures/calendar-mounted-editor.mjs`, `alpha-back`/`launcher-home` synthetic events, `quintCalendar` backdoor) | Verdict: DELETE (T4)
- Covers: Back closes the guest picker then the form keeping the last valid draft; an invalid (2049-char) title never replaces the retained draft; declined discard keeps it, accepted discard clears the invalid latch so Google Calendar scope is available. Duplicates: `specs/quint/refinement/application/canonical-calendar-editor-close.mjs` schedules "shell Back closes picker, then keeps exact draft for Resume" (141), "invalid draft close preserves the last valid exact revision" (151), "decline preserves invalid draft while accepted durable discard clears latch" (155); same fixture and the same `'x'.repeat(2049)` input. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Scenario-for-scenario copy of the Quint replay. | Delete. | None |
| 2 | 50-60 | - | Only extra step: after discard, Settings → Google Calendar opens without "Save draft first". | Add to `journeys/settings.spec.ts` (Google Calendar entry with no retained draft), or accept the loss. | Low |
| 3 | 8 | T8 | 180 s timeout. | Gone. | - |

## Proposed end state
Deleted. Quint replay keeps the editor-close behaviour; the Settings follow-on step becomes one line of the Settings
journey.
