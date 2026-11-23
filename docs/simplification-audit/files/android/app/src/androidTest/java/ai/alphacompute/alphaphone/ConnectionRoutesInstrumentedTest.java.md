# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ConnectionRoutesInstrumentedTest.java
- Lines: 118 | Role: flag-off APK: `AlphaConnection.request` refuses non-`api.eliza.app` origins, the retired pairing route and every DELETE except body-less self-revocation, at VALIDATE, without touching credential slot files. | Verdict: KEEP (absorb Connection duplicate)
- Importers: none. Text/path pins (strong): `scripts/android-instrumentation.ts:232` (`flagOffOnly: true`); `test/android-instrumentation-runner.test.mjs:536-547` reads this source and requires `!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS`, the literal URL fragments `.cloud.eliza.app/api/v1/user`, `https://agent.example.test/api/auth/pair`, `https://api.eliza.app/api/auth/pair`, `https://api.eliza.app/api/v1/api-keys/other`, `/api/v1/api-keys/current").put("method", "DELETE").put("body"`, and the strings `"Connection request failed"` and `"VALIDATE"` (T1 source-text pin).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 87-98 | T1 (pin) | The runner test regex-matches these exact URL literals and formatting (`").put("method", "DELETE").put("body"`), so a formatter or refactor of this array fails host CI | Delete the source-text assertions at `test/android-instrumentation-runner.test.mjs:544-547` (the device run is the evidence); keep the `flagOffOnly` gate check if wanted | Low |
| 2 | 28-36 | C3 | Private `eval`/`until` | Shared helpers | None |
| 3 | 44-55 | C3 | SHA-256 hex of each slot file (digest copy) | Shared `TestDigests.sha256Hex(bytes)` | None |
| 4 | 88-91 | D11 | Comments cite "owner decision A-16" and paired remote agent routes; if P15 deletes pairing/remote modes these cases still prove refusal and stay | Keep | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `request(args)` | helper | 38-42 | ConnectionInstrumentedTest:58-59 (same refusal capture) | keep here (absorbs Connection's duplicate test) |
| `credentialFiles`/`settledCredentialFiles` | helper | 44-77 | none | keep |

## Proposed end state
Keep; add the two extra refused URLs from `ConnectionInstrumentedTest.productionTransport…` (which is deleted). Shared poll/
digest helpers. Remove the source-text pins in the runner test. Estimated 118 -> ~110 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes ConnectionRoutes` on a flag-off build (both variants);
`node --test test/android-instrumentation-runner.test.mjs`.
