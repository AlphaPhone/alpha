# test/browser/calendar-agent-all-day-review.spec.ts
- Lines: 46 | Kind: Playwright, chromium (dev), 1 test; module-in-page driver (`new BrowserCalendar().executeAgent`) + assertions on the stand-in's review dialog and raw store (s2 r3) | Verdict: DELETE
- Covers: the web `AlphaCalendar` stand-in refuses an all-day update whose instants are not whole dates, and its review dialog lists the saved dates/attendees. Duplicates: `dev-calendar-assistant.spec.ts`, `dev-calendar-recurring-assistant.spec.ts` drive the same stand-in review; the Android renderer card is `calendar-proposal-review.production.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16 | T6 / P7 | Operation is injected by `import('/src/browser/calendar.ts')` and `executeAgent`; no agent, no conversation, no user path reaches it this way. The dialog is the web stand-in for Android's native review. | Delete. | Low |
| 2 | 11 | A1 | Seeds `localStorage['alpha.browser.calendar.v1']`, the legacy key read only by the legacy reader (`calendar-store.ts:11`, D1). Breaks when the reader is deleted. | Delete with #1. | None |
| 3 | 1-3 | A8 | "Source/test evidence" banner comment. | n/a | None |

## Proposed end state
File deleted. If the owner keeps the web stand-in as a product surface, the all-day whole-date refusal becomes one case in `journeys/calendar.spec.ts` driven by an agent proposal through the resident-agent harness.
