# test/home-shell.test.mjs
- Lines: 444 | Kind: unit-with-render (imports real `prototype/home-shell.ts` and generated upstream `mobile-shell/navigation.ts` via `tsImport`, installs onto a hand-written fake `Shell` class, renders React to static markup and regex-matches tiles) + one source-text read of `template.html` (438-444) | Verdict: DELETE
- Covers: Home favorites + Apps tile, Apps drawer listing, Add to Home / App info menu, edit mode (long press, remove, reorder, restore, Done/Back), gesture ownership, no app scan until drawer opens, failed launch toast, favorites migration of older view ids, save-failure message in the edit bar. Duplicates: `test/browser/home-app-library.spec.ts` (13 cases: fresh Home core apps and Apps loading, long-press Add to Home/App info with persistence, edit mode remove/rearrange/restore/Done, hold ownership retired when Apps opens, failed refresh, keyboard menu), `home-launcher.spec.ts`, `home-native-launcher.spec.ts`, `drawer-full-height.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-31 | D7 / T3 | A fake `Shell` class re-implements `S`, `setState`, `back`, `goHome`, `shellNavigate`: the test exercises the adapter against a mock of the shell it patches (D2). | Delete. | Low |
| 2 | 323-350 | A1 | "Installed favorites with older Alpha view ids are migrated" and "a refused migration keeps the legacy view": migrate-on-read for data a fresh install cannot have. | Delete with the migration in `home-shell.ts`. | Low |
| 3 | 34-270 | T4 | Edit mode, menu, drawer and gesture cases duplicate `home-app-library.spec.ts`. | Delete. | Low |
| 4 | 272-322, 415-437 | — | Three rules with no browser case found: no installed-app read until the drawer opens; a failed launch and a failed app read toast once with the drawer closed; a failed favorites save shows its error in the edit bar and the next good edit clears it. | Carry to `journeys/home-shell.spec.ts` (DeviceApps fake counting `list` calls; `launch` rejecting; favorites write rejecting). | Low |
| 5 | 438-444 | T1 | Reads `template.html`. | Delete. | Low |

## Proposed end state
File deleted. `home-app-library.spec.ts` becomes part of `journeys/home-shell.spec.ts` and gains the three carried cases.
