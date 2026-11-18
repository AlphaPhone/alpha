# test/browser/gmail-notice-question.spec.ts
- Lines: 32 | Kind: Playwright (`chromium`, dev build), UI journey with backdoor setup (P2/T6) | Verdict: **MERGE** into `journeys/notifications.spec.ts` (together with `reminder-notice-question.spec.ts`)
- Covers: tapping a Gmail "Ask" notification opens the "Ask about selected content" review showing only subject + snippet; Cancel releases the tap; a changed source or owner refuses; "Use in conversation" fills the composer without the private body and consumes the tap once. Duplicates: `reminder-notice-question.spec.ts` (same fixture, same review dialog, reminder source). Callers/importers: imports `flag-off-android` (`seedCompletedAccessSetup`) and `helpers/delivery-fixture` (`installDeliveryFixture`, `startResidentAgent`). 4 tests (loop over `compose|cancel|source-changed|owner-changed`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-15, 21 | T6, P2 | Imports `/src/runtime/connection-ui.tsx` in the page, replaces `getCloudClient` and wraps `getSnapshot` through a WeakMap to fake a signed-in Cloud account; `owner-changed` calls `connectionController.disconnect()` directly instead of signing out in the UI. | Seed the Cloud credential and Gmail routes through the bridge (`harness/plugins/cloud.ts`); drive sign-out through Account → Sign out. | Medium: the WeakMap wrapper exists because the snapshot identity matters to `useSyncExternalStore`; a bridge seed avoids the problem entirely. |
| 2 | 7 | P2 | `startResidentAgent` reaches the connection chooser through `helpers/connection-diagnostics.ts` (`connectionController.open()`). | `harness/nav.ts` → Settings → About → Connection help. | Low. |
| 3 | 14, 18 | T6 | The tap is delivered by `document.dispatchEvent(new Event('visibilitychange'))` after mutating the fixture. | Acceptable as the app-resume signal, but name it `app.resume()` in the harness. | none |
| 4 | 17 | T5 | Screenshot written only for `compose`; nothing reads it. | Drop. | none |
| 5 | 32 | D8 | `test.beforeEach` sits after the loop at the bottom of the file. | Harness option `accessSetup: 'completed'`. | none |

## Proposed end state
One test in `journeys/notifications.spec.ts`: "Ask from a Gmail notice shares only subject and snippet": tap → review shows
excerpt → Cancel releases → re-tap → Use in conversation → composer has subject, not body, tap consumed once. A second
test covers refusal when the source changed. `owner-changed` folds into the connection-cloud journey's sign-out step if
kept. The reminder variant becomes a parameter of the same test. Needs `harness/plugins/notifications.ts` (AlphaGmail +
DailyApps tap ledger) and `harness/plugins/agent.ts`.
