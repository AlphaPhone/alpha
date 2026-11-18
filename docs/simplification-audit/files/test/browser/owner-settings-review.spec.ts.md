# test/browser/owner-settings-review.spec.ts
- Lines: 64 | Kind: Playwright, chromium, `?mode=dev`; UI navigation of grouped Settings with one `/src` state read | Verdict: MERGE into `journeys/settings.spec.ts`
- Covers: Settings remembers its sub-page within a visit and resets on a fresh visit; the agent context names the selected Settings page; grouped Settings (General, Privacy, Apps, About) and the signed-out Account sheet fit at 390 and 1280 px; keyboard focus returns through Display and Back; "Ask before Alpha acts" switch is 52×52 and toggles by Space. Duplicates: `settings-navigation.spec.ts`, `settings-page-accessibility.spec.ts` (focus restore, target sizes). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | T6 | Context read via `import('/src/runtime/alpha-client.ts').alphaClient.getState()`. | Assert the context in the chat journey's outbound request (as other chunks propose) or drop; the visible reset is the user behaviour. | Low. |
| 2 | 42 | D10 | Exact `offsetWidth/offsetHeight` 52×52 next to the ≥44 px bound. | Keep only the ≥44 px target check. | None. |
| 3 | 30-37 | T4 | Focus restore through Display/Back duplicates `settings-page-accessibility.spec.ts`. | Keep in one place. | None. |
| 4 | 21-63 | T7 | Two viewports for one layout rule. | Keep 390 px; check the Account sheet box at 1280 only if no other spec covers desktop. | Low. |

## Proposed end state
Two cases in `journeys/settings.spec.ts`: (1) sub-page is remembered within a visit and reset after leaving; (2) grouped Settings walk: four groups, Privacy switch toggles by keyboard with a ≥44 px target, signed-out Account sheet fits the viewport and closes, About lists Licenses. No `/src` import.
