# test/browser/signed-out-page.production.spec.ts
- Lines: 15 | Kind: Playwright journey (`production` project) on `flag-off-android` + `resident-stub` (native sign-in, empty keystore), network fenced; 3 tests | Verdict: **MERGE** into `journeys/connection-cloud.spec.ts` (production, "mandatory sign-in" section)
- Covers: on a phone with no Cloud key, the mandatory sign-in page shows and no agent controls appear. A pending native verify followed by Back stays on the gate with nothing stored or revoked. An expired code shows the error and allows an explicit retry with the email kept. A successful sign-in removes the gate, and agent controls open as a Settings page with no stream started. `?mode=dev` is ignored in production. Duplicates: `accessibility-sign-in.production` (same page, accessibility), `resident-first-run.production` (`login:'expired'`, 205), `cloud-account-replacement.production` (sign-in expired), `native-cloud-signin.spec`. Callers/importers: none. It imports `flag-off-android`, `resident-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | D8 | Each test is one 600-900 character line. | Format when merged. | none |
| 2 | 10 | T4 | The expired-code case overlaps `resident-first-run.production` (expired). | Keep one expired case in the connection-cloud journey (this one, because it also asserts the email is kept and no key is stored). | none |
| 3 | 8 | – | `page.goto('/?mode=dev')` on the production bundle combined with `expectNoDevelopmentSurface` is a real production-gating assertion. | Keep, or move to `journeys/production-gating.spec.ts`. | none |
| 4 | 15 | – | `beforeEach(seedCompletedAccessSetup)` sits at the bottom. | Move it into the journey fixture. | none |

## Proposed end state
Three steps of the production connection-cloud journey's "mandatory sign-in" section, sharing the `start()` fixture
with `accessibility-sign-in`: pending verify then Back, expired code then retry, and success then agent Settings page.
