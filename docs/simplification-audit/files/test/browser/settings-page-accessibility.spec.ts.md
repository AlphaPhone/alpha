# test/browser/settings-page-accessibility.spec.ts
- Lines: 88 | Kind: Playwright journey (`chromium`, `?mode=mock` and `?mode=dev`), 4 tests | Verdict: **MERGE** into `journeys/settings.spec.ts` (focus and inert), with the developer-rows test in `journeys/dev-surface.spec.ts`
- Covers: Settings marks covered pages `inert`, moves focus to the new page's Back, and restores focus to the opening row on return (Display, Apps → Passwords/Calendar, mock Accounts → Add account). Developer-only rows (Developer, Try mock mode, Calendar backups) appear only with `?tools=1`. The license list restores focus to About. Duplicates: `settings.production` and `settings-device-facts` (developer rows absent), `settings-navigation.spec.ts` (Licenses → About). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-55, 68-70 | A3 (D3) | It asserts the "Calendar backups" developer row (`settings-adapter.ts:870`, `openCalendarRecovery`), which belongs to the calendar backup/restore being deleted. | Remove both assertions in the same change as the backup deletion. | Breaks when D3 lands. |
| 2 | 3, 31-39 | D6 / owner question | The `mock` variant drives the reference prototype's Settings (Accounts → Add account), which no production build shows. | Keep only if mock-mode Settings is a retained dev surface (D19). Otherwise delete the mock branch. | Low |
| 3 | 43-71 | T4 | The developer-rows gating overlaps `settings.production` ("excludes developer rows for every entry mode") and `settings-device-facts` (113-136). | One test in `journeys/dev-surface.spec.ts` (present with `?tools=1` in dev) and one in `journeys/production-gating.spec.ts` (absent in production). | none |
| 4 | 74-88 | T4 | The license focus overlaps `settings-navigation`. | Merge with it. | none |

## Proposed end state
In `journeys/settings.spec.ts`, one keyboard step covers Display and back, Apps → Passwords and back, Apps → Calendar and
back, and About → Licenses and back. It asserts inert, focus on Back and focus restored, and it includes the Android
Back pops from `settings-navigation`. The developer-rows gating lives in the dev-surface journey without Calendar
backups.
