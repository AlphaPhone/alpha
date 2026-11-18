# test/browser/remaining-subview-accessibility.spec.ts
- Lines: 24 | Kind: Playwright, chromium; test 1 deep-links into mock-mode subviews (`?mode=mock&start=view:sub`, 20 generated tests with a screenshot each); test 2 opens three apps in dev mode (3 tests); test 3 seeds a file through an in-page `registerPlugin('AlphaFiles').importFile` | Verdict: **MERGE** into `journeys/accessibility.spec.ts`
- Covers: when a subview (Calendar event/new/invite/add, Browser tabs, Photos viewer, Notes editor/voice, Files folder/preview) covers its list, the list is `inert` and `aria-hidden`, focus starts in the subview and Tab never enters inert content; closing returns focus to the opener; Files returns focus through nested preview and folder. Duplicates: the accessibility sweep checks inert/hidden coverage per state; focus return is also asserted in calendar/notes specs (other chunks). Callers/importers: imports `helpers/browser-calendar`, `helpers/legacy-notes`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | A1 | Notes focus-return test opens Notes through `openLegacyNotes` (deleted source). | Open current Notes. | Low |
| 2 | 4 | – | Calendar `invite` and `add` subviews: check they survive the Calendar linked-sync deletion (D4) before carrying them. | Carry only subviews that still exist. | Low |
| 3 | 11 | – | 20 screenshots that nothing compares. | Drop or attach only on failure. | none |
| 4 | 19 | T6-lite | Seeds a file through the plugin stand-in. Acceptable as bridge-level seeding. | Use the shared Files fixture. | none |
| 5 | 5-12 | T7 | Theme loop doubles 10 cases for a rule (inert/focus) that does not depend on theme. | Run light only. | none |

## Proposed end state
In `journeys/accessibility.spec.ts`: one table-driven "covered list is inert and focus stays in the subview" test over the remaining
subviews (light theme), one "focus returns to opener" loop over Calendar/Browser/Notes, and the Files nested-return case.
