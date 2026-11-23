# test/browser/settings.production.spec.ts
- Lines: 78 | Kind: Playwright journey (`production` project), 4 tests | Verdict: **MERGE** into `journeys/settings.spec.ts` (production file), with the entry-mode gating test in `journeys/production-gating.spec.ts`
- Covers: production Settings opens every category (General, Privacy, Apps, About) and every app's settings through the displayed controls (an app with nothing to set opens the app). Theme toggles. Developer and removed rows are absent for `/`, `?tools=1` and `?mode=dev&tools=1`. The Google account entry opens and dismisses its dialog. About has licenses but no fabricated device facts or diagnostics, and `ElizaSystem` role calls in a browser reject with the OS-managed message. Duplicates: `settings-truth.production` ("every Settings row … no Developer", About quiet), `settings-page-accessibility` (developer rows), `settings-device-facts` (About quiet). Callers/importers: none. It imports `flag-off-android`, `resident-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | T4 / B4 | `test.skip(project!=='production')` is redundant with the config `testMatch`. | Delete. | none |
| 2 | 9 | T8 | `timeout: 240_000` for navigation-only tests. | Use the default timeout. Test 1 loops 14 page loads; reuse one page and navigate with Back instead of `goto` each time. | Low |
| 3 | 41-50 | T4 | Entry-mode gating is a production-gating rule, also partly in `settings-truth` (211). | Move to `journeys/production-gating.spec.ts`. | none |
| 4 | 66-78 | T4 | The "About quiet" regex duplicates `settings-truth.production` 202-204 and `settings-device-facts`. | Keep once (here), and delete the others. | none |
| 5 | 8 | C6 | The `alpha.connection.selection.v1` literal again. | Harness constant. | none |

## Proposed end state
In the production Settings journey: "every category and app settings entry" (one page, Back navigation, theme toggle),
"Google accounts dialog" and "About and licenses, role calls refused". The entry-mode gating moves to the
production-gating journey.
