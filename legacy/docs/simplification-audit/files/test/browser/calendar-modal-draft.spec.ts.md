# test/browser/calendar-modal-draft.spec.ts
- Lines: 32 | Kind: Playwright, chromium + firefox + webkit (`scripts/storage-specs.ts:10`), 7 tests (×3); opens the web stand-in's modal editor by `new BrowserCalendar().edit(...)` in page (s7 r40) | Verdict: DELETE (keep one case in the dev section of `journeys/calendar.spec.ts` only if the owner keeps the web editor)
- Covers: the web `AlphaCalendar.edit` modal (`browser/calendar-editor.ts`) retains an all-day weekly edit across reload, refuses an older revision, discards on confirm, resolves cross-tab drafts, does not re-dispatch after a failed draft cleanup, handles oversized text and stays reachable at 360×360. Duplicates: modal editor driven through the UI by `dev-calendar-editor.spec.ts`, `dev-calendar-conversion.spec.ts`, `dev-calendar-cross-tab.spec.ts`. Callers/importers: chromium; `scripts/storage-specs.ts`; imports `calendar-draft-readiness.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T6 / P7 | Seeds with `BrowserCalendar.save` and opens with `BrowserCalendar.edit` directly; the modal is the web stand-in for Android's native editor intent. | Delete. | Low: web-only editor draft retention loses its dedicated coverage. |
| 2 | 25 | P3 | `IDBObjectStore.prototype.put` throws for `alpha.browser.assistant-draft:` keys. | Goes with #1. | None |
| 3 | 19 | — | Uses native `window.confirm` (`page.once('dialog')`) for Discard. | n/a | None |
| 4 | 31 | B5 | Screenshot with no consumer. | n/a | None |
| 5 | — | T4 | Three engines. | n/a | None |

## Proposed end state
File deleted; `scripts/storage-specs.ts` loses line 10. If the web editor stays a product surface, one dev-lane case "all-day weekly edit survives reload and saves the existing event" opened from the Calendar UI.
