# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CloudSignInCallbackInstrumentedTest.java
- Lines: 97 | Role: App Link return `https://eliza.app/alphaphone/auth/callback` resolves only to MainActivity; mismatching, parameterless and expired returns leave the pending record and write no credential; sign-in slots are native-only. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:150` (`args: { cloudSignInNative: "1" }`); `test/android-instrumentation-runner.test.mjs:144-150` requires the text `"1".equals(InstrumentationRegistry.getArguments().getString("cloudSignInNative")`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-89 | C5 | Three tests share the same arrange/act/assert skeleton (read `cloudBefore`, write pending, launch callback intent, `holdFor`, assert pending + credential unchanged, remove pending) | One private `assertReturnIgnored(String uri, CloudSignInFlow.Pending pending, long holdMs)`; three one-line tests | Low |
| 2 | 30, 53, 66, 83, 86 | T8 | `holdFor(millis)` = `SystemClock.sleep` (3000/3000/5000/2000 ms); it is a negative observation window (no write happens) so it cannot wait on a condition | Keep the windows but delete the alias `holdFor` (call `SystemClock.sleep`) | None |
| 3 | 49, 55, 62, 68, 79, 84, 87 | C6 | `"cloud:production"` literal ×7 | Slot constant from the store (P6) | None |
| 4 | 24 | C3 | `intent(uri)` same as CloudDelegationCallback:17 | Shared `AppNavigation.viewIntent` | None |
| 5 | 92-96 | T3 | `signInSlotsAreNativeOnly` is a pure policy check of `RendererCredentialSlots.requireAllowed` (no device state); `ConnectionInstrumentedTest.reservedNativeSlotsRejectEveryPublicStorageOperation` already proves every native namespace (incl. `cloud-signin`) is refused through the real bridge | Delete this method | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `context()`/`intent()`/`store()` | helper | 23-28 | CloudDelegationCallback:17, many `getTargetContext()` one-liners | `AppNavigation.viewIntent`; keep `store()` |
| `HOST`/`callback(state)` | const/helper | 25-26 | none | keep |
| `holdFor` | helper | 30 | alias of `SystemClock.sleep` | delete |

## Proposed end state
Keep `returnLinkResolvesOnlyToMainActivity` and the three ignored-return cases via one helper; delete
`signInSlotsAreNativeOnly` and `holdFor`. Estimated 97 -> ~60 lines.

## Verification
`--classes CloudSignInCallback` (both variants; `cloudSignInNative=1`), `ConnectionInstrumentedTest#reservedNativeSlotsRejectEveryPublicStorageOperation` (native-slot-isolation phase), `node --test test/android-instrumentation-runner.test.mjs`.
