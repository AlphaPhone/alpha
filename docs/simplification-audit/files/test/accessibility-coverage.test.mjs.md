# test/accessibility-coverage.test.mjs
- Lines: 311 | Kind: source-text (regex over `mvp-features.ts`, `template.html`, `phone.css`, `main.tsx`, several runtime files, generated `.eliza` and `vendor/eliza` text, Java instrumentation sources, and the text of three Playwright files) | Verdict: DELETE
- Covers: that the accessibility sweep specs still contain states for every view, that layout hooks and CSS rules are present, and that the browser and Android reading-order rules use the same literal formula. Duplicates: the sweep itself (`test/browser/accessibility-sweep.spec.ts`, `accessibility-sweep.production.spec.ts`, `accessibility-lifecycle.spec.ts`) and `AccessibilityViewsInstrumentedTest`. Callers/importers: `npm test` glob only; imports `test/browser/accessibility-audit.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-196 | T1, T5 | About 108 regex assertions over the text of other tests (the sweep, its states table, the audit helper). A test of tests. | Delete. | Low |
| 2 | 13-20 | T1 | Parses `ENABLED_MVP_VIEWS` out of `mvp-features.ts` with a regex instead of importing it. | Gone with the file; if the sweep needs the list, import the constant in `accessibility-states.ts`. | Low |
| 3 | 63, 77-79, 213-215 | A1, A2 | Pins `legacyNotes` states, "Previous notes" and `calendarSyncFixture`/`googleCalendar('review')` states: features deleted by D1 and D4; already stale against the current tree. | Delete. | None |
| 4 | 225-311 | T1 | Pins CSS declarations, template hooks, `model.js` and `inline-modal.ts` text; blocks the formatter (D9) and every split. | Delete; the sweep's clipping/overlap/dock rules already test the rendered result. | Low |
| 5 | 198-205 | T5 | Unit test of the test helper `blocking()`. | Delete. | None |
| 6 | 164-170 | T1 | "Browser rule equals Android rule" is checked by comparing two source strings. | Delete; if parity matters, drive both from one shared fixture page (owner question). | Low |

## Proposed end state
File deleted. Coverage of "every retained view is swept" moves into the sweep itself: `accessibility-states.ts` imports
`ENABLED_MVP_VIEWS` and fails (in Playwright) if a view lacks a state, so the check runs against the real list at the place
it matters. That fits the planned `journeys/accessibility.spec.ts`.
