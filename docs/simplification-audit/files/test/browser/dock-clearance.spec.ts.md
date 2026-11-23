# test/browser/dock-clearance.spec.ts
- Lines: 39 | Kind: Playwright, chromium. A route-fulfilled fake DOM plus a direct `installDockClearance()` call in the page. A unit test in a browser costume (T6) | Verdict: **DELETE**
- Covers: `installDockClearance` publishes the `--alpha-header-clearance`, `--alpha-dock-clearance` and `--alpha-dock-rest` CSS variables from the chat-half/full header and composer heights; a stale installer's disposer cannot clear a newer installer's values; the last disposer clears them. Duplicates: Quint `specs/quint/refinement/application/dock-clearance-ownership.mjs` with `test/quint-dock-clearance-ownership.test.mjs` (installer ownership), the accessibility sweep's dock rules (`accessibility-sweep.spec.ts`, `accessibility-states.ts`), and the drawer and full-chat layout specs, which measure real clearance. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-14 | T6 | The page is hand-written HTML served by `page.route`, not the product. It imports the module from `/src` on a non-app route. | Delete. | Low. Ownership is model-checked, and the real layout is measured by journey specs. |
| 2 | 16 | B2 | `'/src/runtime/dock-clearance.ts' as string` is a cast to silence the type checker on an in-page import. | Deleted with the file. | none |

## Proposed end state
Delete the file. `journeys/home-shell.spec.ts` (from `drawer-full-height` and `full-chat-grabber`) asserts that the
last control clears the dock and that the header clears the status band on the real app.
