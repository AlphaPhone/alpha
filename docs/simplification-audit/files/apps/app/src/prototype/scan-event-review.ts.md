# apps/app/src/prototype/scan-event-review.ts
- Lines: 32 | Role: "Create event draft" disclosure inside the scan text review: fills a form from shared poster suggestions, flags unclear fields, offers a suggested repeat, and hands a reviewed draft to Calendar (never saves). | Verdict: SIMPLIFY + MERGE `scan-event.ts` into it
- Importers: 1 — `scan-review.ts:3` (`createScanEventReview`).
- Text/path pins: `specs/quint/application/manifest.json:3341` (source list); `specs/quint/refinement/application/canonical-calendar-draft-handoff.mjs:13` and `specs/quint/refinement/legacy/camera-session.mjs:15` (input lists); `test/browser/scan-event.spec.ts`; `test/support/feature-parity.mjs:412`. User-visible copy pinned by browser specs: "Create event draft", "Check blanks", "Review in Calendar", "Calendar unavailable", "✦ Repeat …", aria-labels "Event title", "Event date", "Event start time", "Event duration in minutes", "Event location", "Suggestion notes", "Printed time zone", "Event draft status".

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-21 | D12 | Nearly every element gets `style.cssText` (summary, dot ×2, notes list, form, label, input, checkbox, submit button) — ~1 KB of inline CSS, including hex fallbacks `#f5a524` (×2), `#eee`, `#aaa`, `#d70015` that bypass `theme-palette.test.mjs` (CSS/HTML only). | Move to `scan-dialog.css` classes (`.scan-event-form`, `.scan-dialog-field`, `.scan-dialog-check`, existing `.scan-dialog button`). Invalid border colour → `var(--alpha-status-error)`. | Low (visual). |
| 2 | 7, 13 | C3 | Amber "unclear" dot built twice here and once in `scan-document.ts:92`; CSS twin `phone.css:33-35` `.settings-dot[data-dot="warn"]`. | Shared `.alpha-status-dot` class. | Low. |
| 3 | 13-14 | C3 | `input()`/`check()` label+field builders duplicate the field skin in `scan-dialog.css:23-27,43`. | Keep the builders, drop their inline styles; use `.scan-dialog-field`. | None. |
| 4 | 30 | D8 / D9 | `form.onsubmit` is one 600-char line: picks all-day vs timed draft, calls `review`, marks invalid fields on error. | Format; extract `markInvalid()`. | None. |
| 5 | 1 + `scan-event.ts` | D4 / C5 | `scan-event.ts` (19 lines) is half re-export shim (`suggestScanEvent`, `suggestScanEventDetails`, types from plugin-files) and half `calendarDraft()` mapping used only here. | Merge: import `suggestScanEventDetails`/types straight from the plugin-files module and move `ScanEventDraft`, `calendarDraft`, `scanEventDraft`, `scanAllDayEventDraft` into this file. `scan-review.ts:4` imports `type ScanEventDraft` from here. | Low; tests `test/scan-event.test.mjs`, `test/scan-all-day-draft.test.mjs` change their import path. |
| 6 | 8 | — | `Intl.DateTimeFormat().resolvedOptions().timeZone` — same expression in `reminder-adapter.ts:285`. | Fine; optional shared `deviceTimeZone()` in `locale-time.ts`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `repeatLabel` | const | 3 | none | here |
| `input`, `check` | helper | 13-14 | field skin in `scan-dialog.css`; `scan-correction-review.ts:19` builds number inputs similarly | here (styles to CSS) |
| `unclear` | const | 12 | — | here |
| amber dot | const (inline style) | 7, 13 | `scan-document.ts:92`, `phone.css:33` | `.alpha-status-dot` |

## Proposed end state
One `scan-event-review.ts` (~45 lines formatted) holding the review UI plus the reviewed-proposal → Calendar form mapping formerly in `scan-event.ts`; no inline styles; suggestions and validation imported directly from plugin-files.

## Verification
`node --test test/scan-event.test.mjs test/scan-all-day-draft.test.mjs` (update import path); `npm run test:browser -- scan-event`; Quint `canonical-calendar-draft-handoff` (input list) and application manifest source list.
