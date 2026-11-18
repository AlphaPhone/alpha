# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxFixtureSignIn.java
- Lines: 32 | Role: test-APK stand-in for `AlphaCloudSignIn`; stores a synthetic credential and provides JS that drives the real email-code sign-in screen. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `InboxFixtureActivity`, `InboxDraftInstrumentedTest`, `VoicePermissionDeniedInstrumentedTest`. Text/path pins: none (but the `DRIVE_*` JS pins renderer copy `'Email me a code'`, `'Verify'`, `#alpha-sign-in-other-methods`, `.alpha-cloud-sign-in` — renderer renames must update it).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24 | C6 | `"cloud:production"` literal (32x in main Java, more in tests). | Use the main-source constant once android P6 introduces one. | Low |
| 2 | 14-15 | C5 | The sign-in drive sequence (`until(SIGN_IN_PAGE_READY); js(DRIVE_EMAIL); until(one-time-code); js(DRIVE_CODE)`) is repeated in `InboxDraftInstrumentedTest.java:95-97` and `VoicePermissionDeniedInstrumentedTest.java:73-74`. | Add `static void signIn(Function<String,String> js)` here; both tests call it. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DRIVE_EMAIL`, `DRIVE_CODE` | const | 14-15 | none | keep, plus a `signIn` helper |

## Proposed end state
Same plugin; one `signIn` helper replacing the two inline sequences. About 36 lines.

## Verification
Inbox draft and voice-permission campaigns on a flag-off build.
