# test/browser/settings-device-facts.spec.ts
- Lines: 225 | Kind: Playwright journey (`chromium`) on a private Android bridge (`w.androidBridge={}` plus a 60-line `Capacitor` fake for `ElizaSystem`, `AlphaDevice`, `AlphaConnection`, …), reading `upstream.lock.json` in Node; 9 tests | Verdict: **MERGE** into `journeys/settings.spec.ts` (chromium, "Android device facts and updates" section)
- Covers: HOME/assistant role state, with a declined then accepted request read back from Android, a resume re-read, and the Default apps handoff. The standalone variant never offers HOME. A text-size change does not discard a held facts read. Permission handoff → Android privacy page. Developer navigation boundaries with `?tools=1`. App update: manual check results (none offered, failure, offered), a failed check stays due, single-flight checks across resumes, Install sends only `{apkUrl, sha256, sizeBytes, versionCode}`, a restart reuses the kept answer, an unshowable versionName is still offered, the flavor/signer/version filters apply and a withdrawn release removes the offer, and a browser build never checks. Duplicates: `settings-truth.production` (privacy handoff, About quiet), `settings.production` and `settings-page-accessibility` (developer rows only with `?tools=1`). The host tests `test/app-update.test.mjs` and `test/settings-truth.test.mjs` reference this file in comments. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3, 58 | B5 / A3 | It reads `upstream.lock.json` only to feed `diagnosticsFacts`, which serves the export the About page no longer offers (113-136 asserts it is absent). | Delete the read and the `diagnosticsFacts`/`shareDiagnostics` handlers if no kept test opens the Developer page's export. | none |
| 2 | 9-67 | C4 / T7 | A private bridge that duplicates the device parts of `settings-truth.production`'s bridge (snapshot, roles, openSettings). | `harness/plugins/device.ts` (`ElizaSystem` roles with `decline`, `AlphaDevice` snapshot, `hold`, and update answers), shared by both settings journeys. | Low |
| 3 | 113-136 | T4 | Permission handoff, developer rows and About quiet are all asserted again in `settings-truth.production`, `settings.production` and `settings-page-accessibility`. | Delete here. Keep the developer-rows gating once in `journeys/dev-surface.spec.ts`. | none |
| 4 | 142-215 | T7 | Four update tests share one setup. | Merge into two: "manual check outcomes and filters" (none, fail, offered, wrong flavor/signer/version, withdrawn) and "background check" (failure stays due, resumes share one check, install payload, restart reuses the answer). Fold the unshowable versionName case into the first. | none |
| 5 | 164, 175, 185, 222 | T8 | `waitForTimeout(500)` ×4 to prove that no further `checkForUpdate` happens. | Use `page.clock.install()` and fast-forward past the check interval, then assert the count. | Low |
| 6 | 12 | B1 | A `try{localStorage.setItem}catch{/* covered elsewhere */}` in a fixture that never blocks storage. | Remove the try. | none |

## Proposed end state
In the chromium Settings journey, `describe('Android facts and updates')` holds about 5 tests on `harness/plugins/device.ts`:
role request and read-back (launcher), standalone with no HOME offer, held facts read with a text-size change, manual
update outcomes and filters, and background update scheduling with install payload. A final step checks that the
browser build never checks for updates. There are no sleeps and no upstream-lock read.
