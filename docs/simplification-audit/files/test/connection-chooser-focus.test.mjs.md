# test/connection-chooser-focus.test.mjs
- Lines: 37 | Kind: transplant (slices a `useEffect` body from `connection-ui.tsx` between `  useEffect(() => {\n    if (!visible) return;\n    const previous = document.activeElement` and `  const env = (): CloudEnvironment`, wraps it in a synthetic `Chooser` component via `new Function`, runs it under React + JSDOM) | Verdict: DELETE
- Covers: the connection chooser keeps focus on the focused input across busy/purpose/billing updates, makes the phone shell inert while open, restores focus to the opener exactly once on close/unmount, and Escape uses the current busy state. Duplicates: `test/browser/view-focus.spec.ts` and the accessibility sweep (`test/browser/accessibility-*.spec.ts`) check dialog focus return; Escape-cancel while busy is covered by `test/browser/connection-*.spec.ts` only indirectly. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 / A8 | `ALPHA_FOCUS_BASELINE=1` runs the test against a pinned historical commit via `git show 51bcc46d…`. Nothing sets it (`git grep` finds only this file). | Delete with the file. | Low |
| 2 | 10-16 | T2 | Exact whitespace-sensitive marker on a React effect; the "component" under test is a hand-built stand-in, not `ConnectionChooser`. Breaks on Prettier (D9). | Delete. | Low |
| 3 | 13 | T2 | Also transplants `modal-inert.ts` by text instead of importing it. | Delete. | Low |
| 4 | 26-37 | — | Two behaviours worth keeping: focus retained across re-renders while open, single focus restore to the opener on close. | Carry both as one step in `journeys/connection-cloud.spec.ts`: open account sheet from Settings, type in Email, trigger a busy update, close, assert focus returns to the opener. | Medium |

## Proposed end state
File deleted. One Playwright step in `journeys/connection-cloud.spec.ts` (chromium project) covers focus retention and
restore on the real `ConnectionChooser`; the a11y sweep already asserts the shell is inert under modals.
