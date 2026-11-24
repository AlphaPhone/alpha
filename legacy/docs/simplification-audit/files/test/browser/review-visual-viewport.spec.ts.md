# test/browser/review-visual-viewport.spec.ts
- Lines: 53 | Kind: Playwright spec (`chromium`, `?mode=dev`), 2 tests via loop; opens dialogs by importing product modules (T6) | Verdict: **REWRITE** as a keyboard step in `journeys/accessibility.spec.ts`
- Covers: when a software keyboard shrinks only the visual viewport (height 320, offsetTop 0 and 110), the Calendar event editor and an operation review dialog stay inside it with 44 px Save/Confirm/Cancel, and the editor keeps its value and caret. Duplicates: the caret-through-resize part of `responsive-surfaces.production.spec.ts` ("a Calendar event draft keeps its text, caret…"), which uses layout-viewport resizes, not visual-viewport. Callers/importers: none. It imports `calendar-draft-readiness`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-17 | T6 | It opens the editor through `import('/src/browser/calendar-editor.ts').editCalendarEvent(...)` and the review through `new BrowserReviews().confirm(...)`, not through any user action. | Open Calendar → New event through the UI. For the review, use a real confirm flow (`BrowserReviews` is used by `browser/deletions.ts`), for example a Files delete review. | Low |
| 2 | 25-33 | – | The visual-viewport emulation (`defineProperty` on `visualViewport.height/offsetTop` and dispatching resize/scroll) is the only way to emulate an IME keyboard in Chromium and is legitimate. | Move to `harness/keyboard.ts` `showSoftKeyboard(page, {height, offsetTop})`. | none |
| 3 | 6 | T7 | It is a one-file micro-spec. | Merge. | none |

## Proposed end state
One test in the accessibility journey's keyboard section. It opens a new Calendar event from the app, types and places the
caret, shows the soft keyboard at two offsets, and asserts that the actions are inside and 44 px and that the value and
caret are kept. Then it repeats the inside/44 px check for one review dialog reached through the UI. The harness owns the
viewport emulation.
