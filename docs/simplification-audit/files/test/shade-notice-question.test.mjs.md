# test/shade-notice-question.test.mjs
- Lines: 37 | Kind: transplant (via `test/fixtures/shade-notice-question.mjs`: JSDOM + text slices of `notifications-adapter.ts`, `context-selection.ts` and `browser/content-question.ts`) + Quint refinement call | Verdict: DELETE
- Covers: Asking about an own notification from the shade composes a draft only while the same shade visit, screen and foreground last. Duplicates: `checkShadeNoticeQuestionAdmission` also runs in the aggregate `test/quint-application-refinement.test.mjs` via `specs/quint/refinement/application/index.mjs:126`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 6-32 | T2 | Fixture concatenates sliced source ranges (`const OPAQUE = `, `export const ASKABLE_NOTICE_KINDS`...`export type CaptureSelection`, `const opaque`...`type Notice =`). | Delete the test; the fixture stays only while the Quint harness needs it. | Low |
| 2 | 34-37 | T4 | Re-runs a Quint refinement already run by the aggregate; exact trace count `12` is B5 ceremony. | Delete. | Low |

## Proposed end state
File deleted. Fixture `test/fixtures/shade-notice-question.mjs` keeps one importer
(`specs/quint/refinement/application/shade-notice-question-admission.mjs`), which must be PORTed to mount the real adapter
(an exported `installNotificationsAdapter` already exists; needs exported `ASKABLE_NOTICE_KINDS` and the dialog module imported, not sliced).
Journey coverage: one case in `journeys/notifications.spec.ts` (Ask about own notice, close shade before answer, no draft).
