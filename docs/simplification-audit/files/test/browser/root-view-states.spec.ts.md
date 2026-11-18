# test/browser/root-view-states.spec.ts
- Lines: 113 | Kind: Playwright journey (`chromium`, dev server, fresh profile; real navigation), 49 tests (12 views × 2 themes × {fresh, storage blocked} + 1) | Verdict: **MERGE** into `journeys/home-shell.spec.ts` ("fresh profile" section), collapsed to one test per view
- Covers: on a fresh profile every root view (Inbox, Calendar, Reminders, Browser, Camera, Photos, Maps, Notes, Files, Workflows, Settings, Notifications) shows an honest labelled empty or unconnected state with no fixture identities, applies the theme, exposes a named landmark, and keeps keyboard focus on a named control. With storage blocked, it raises a role=alert. The empty Calendar timeline is keyboard scrollable. Duplicates: `shaw-ui-fixtures.spec.ts` (unconnected Home, empty Files), `production-surface.spec.ts` (Notes unavailable), `accessibility-sweep` (same screens). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72-107 | T7 / P1 | 48 cold page loads, 60 s timeout each (31). The theme only feeds one luminance check (64-71). | One test per view: fresh light, then switch to dark (`?theme=dark` reload) for the luminance and fixture checks, then the blocked-storage run. That is 12 tests instead of 48. | Low |
| 2 | 41-53 | D6 / A8 | The `Notifications` view opens the development stand-in shade (`?shell=launcher`, comment cites `#416`). Production has no Alpha shade (`settings-truth.production` asserts this). | Keep only while the dev shade is retained (D19). Otherwise drop the view. Delete the issue reference. | Low |
| 3 | 49 | T6-lite | It uses a raw mouse drag on `[data-screen]` with hand-scaled coordinates. `settings-truth.production` has the same `drag()`. | Use `harness/gestures.ts` `pullDown(page)`. | none |
| 4 | 28, 86-87 | – | The fixture-identity leak check (`Maya`, `Jordan`, `2,418 items`…) overlaps `settings-truth.production`'s `fixtureValues`. | One `noFixtureValues(text)` helper in the harness. | none |
| 5 | 101-106 | – | The blocked-storage alert is real behaviour reached through the UI. | Keep. | none |

## Proposed end state
`describe('fresh profile')` in the Home/shell journey has 12 per-view tests plus the timeline keyboard test. It uses
shared `pullDown` and `noFixtureValues` helpers. The Notifications view is present only while the development shade
exists.
