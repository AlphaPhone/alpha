# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CrossAppNotificationsInstrumentedTest.java
- Lines: 86 | Role: cross-app notification mirror with two separately signed synthetic fixture apps: explicit grant, selection, preview redaction, replacement revisions, real PendingIntent tap, clear, encrypted history, queued-event race after Clear, mock pause, revoke. | Verdict: SIMPLIFY
- Importers: none; uses `NotificationAccessTestDriver` statics. Text/path pins: `scripts/test-cross-app-notifications.ts:158` (class name + `crossNotifications=1`); that script is not wired into `package.json` or any workflow (manual campaign, with `scripts/build-notification-fixture.ts`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-19 | T5 / D7 | Reflects into upstream `NotificationMirrorListenerService.events` to hold the real worker (`getDeclaredField("events")`) | Keep while this race is Alpha's to prove; the race fence lives in upstream code, so the test should move upstream with it | Medium (breaks on upstream rename) |
| 2 | 82 | D8 / C5 | Cleanup is one ~800-char line that restores `SharedPreferences` by type; the same restore loop is in `CrossAppNotificationsRestartInstrumentedTest:69` | `NotificationAccessTestDriver.restorePrefs(Map<String,?>)` used by both | Low |
| 3 | 44-48 | C5 | Fixture-identity assertions (distinct UID and signature for SELECTED/EXCLUDED) duplicate `CrossAppNotificationsRestart.fixtureIdentity()` (34-36) | Move `fixtureIdentity()` into `NotificationAccessTestDriver` | None |
| 4 | 3-4 | A7 | Wildcard `import android.app.*; import android.content.*;` — only `Context` is used from them | Explicit imports | None |
| 5 | whole | owner | The campaign has no CI or package script; research (android.md §5) says keep only if wanted | Owner question: keep the manual campaign? | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `queuedEventCannotRepopulateClearedHistory` | helper | 16-40 | none | keep |
| inline prefs restore | helper | 82 | CrossAppNotificationsRestart:69 | `NotificationAccessTestDriver.restorePrefs` |

## Proposed end state
Keep the journey (only evidence for selection/redaction/tap on real foreign notifications); share fixture-identity and prefs
restore with the restart class; explicit imports. Estimated 86 -> ~75 lines.

## Verification
`node scripts/build-notification-fixture.ts && node scripts/test-cross-app-notifications.ts` on a disposable emulator (test-mocks build).
