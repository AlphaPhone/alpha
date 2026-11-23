# android/app/src/main/res/values/alpha-canonical-notifications.xml
- Lines: 3 | Role: `custom_url_scheme` = `alphaphone`, the deep-link scheme the shared canonical-notification projector uses to turn a verified tap into a `VIEW` intent. | Verdict: KEEP (add a comment)
- Importers: looked up reflectively by the generated resident class `NativeNotificationProjector` (listed in `android/consumer-host.json:136` `residentHost.classes`): `vendor/eliza/packages/app/platforms/android/app/src/main/java/ai/elizaos/app/NativeNotificationProjector.java:123` `getIdentifier("custom_url_scheme", "string", …)`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | — (correction) | Research flagged `custom_url_scheme` as having no reader. A plain grep misses it because the reader uses `getIdentifier` by name; deleting it makes every canonical notification tap open `ACTION_MAIN` with no route (projector line 124: `resource == 0 ? null`). | Keep. Add `<!-- Read by name by the generated NativeNotificationProjector (getIdentifier). -->` so the next audit does not delete it. | High if deleted |
| 2 | 2 | C6 | Scheme literal `alphaphone` also in `AndroidManifest.xml:134` (`android:scheme="alphaphone"`), `AlphaBrowserStores.java:23,37`, `AlphaConnectionPlugin.java:30` (`DELEGATION_SCHEME`). | Optional: Java reads `R.string.custom_url_scheme`; manifest uses `@string/custom_url_scheme`. Low value. | Low |
| 3 | file name | D11 | Name is fine once the comment says who reads it. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `custom_url_scheme` | const (string res) | 2 | literals listed in finding 2 | here |

## Proposed end state
4 lines: the string plus a comment naming its reflective reader. Release `shrinkResources` keeps it because the name appears as a string constant in dex (verify in `aapt2 dump resources` of a release APK).

## Verification
Notification-tap instrumentation (canonical notification / `AlphaCanonicalNotifications` suites) on a test-mocks build; release APK resource dump.
