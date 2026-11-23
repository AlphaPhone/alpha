# test/browser/subview-accessibility.spec.ts
- Lines: 29 | Kind: Playwright chromium, 8 tests (theme × [Inbox + 3 workflow subviews]); real UI, reaches subviews through `?mode=mock&start=…` (s0 r10) | Verdict: MERGE into `journeys/accessibility.spec.ts`
- Covers: opening an Inbox draft or mail and a Workflow detail/run/builder makes the covered list inert/aria-hidden, moves focus to the subview's first control, keeps Tab inside the active subview, and returns focus to Compose on Back. Duplicates: `remaining-subview-accessibility.spec.ts` (same pattern, other views), `standalone-shell.spec.ts` half-chat inert checks. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | T4 | Every case runs in light and dark; inert/focus behaviour does not depend on theme. Doubles cost. | Light only. | None |
| 2 | 13, 19 | P2 / D5 | `?mode=mock&start=inbox:mail` and `start=workflows:run` deep-link into fixture state. | Open by clicking a mail and a workflow row from the list (fixture data via harness). | Low |
| 3 | 26 | — | Screenshot with no assertion. | Drop. | None |
| 4 | 25 | — | 12-Tab loop checking focus is never inside `[inert]` is a good generic check. | Make it a shared helper `expectTabStaysOutOf(page,'[inert]')`; used also by `standalone-shell`. | None |

## Proposed end state
In `journeys/accessibility.spec.ts`: one "covered list retires behind a subview" case for Inbox compose and mail (focus moves in, list inert, Back restores focus to Compose), and one for Workflows detail/run/builder (loop of three), using the shared Tab helper and UI navigation. Merge with `remaining-subview-accessibility.spec.ts`. Delete this file.
