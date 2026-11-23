# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CloudVoiceInstrumentedTest.java
- Lines: 73 | Role: real WebView bridge -> `AlphaVoiceCloud` private recording, STT/TTS transport to a loopback synthetic server, MediaPlayer playback; refuses stale credential, HTML MIME, redirect, foreign origin. Test-mocks build only. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:225` (`CloudVoice: { requiresTestMocksBuild: true }`).
  Production dependency: writes `AlphaVoiceCloudPlugin.instrumentationBaseUrl` / `instrumentationCredentialSlot` (48) — the P12 test hook fields in main (`AlphaVoiceCloudPlugin.java:57-58,197,205`); this is the **only** user of those fields (git grep).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48 | D6 / D7 (android P12) | Test drives production-set test hooks `plugin.instrumentationBaseUrl="http://127.0.0.1:"+port; plugin.instrumentationCredentialSlot=fixtureSlot;` | Move the override into the testMocks source set (e.g. a `VoiceCloudEndpoints` provider replaced in testMocks) and set it from there; then delete the two fields from main | Medium: touches main voice transport |
| 2 | 26-37 | C3 / C5 | Hand-written single-thread HTTP/1.1 loopback server (`ServerSocket(0,8,127.0.0.1)`, header parse, Content-Length read); 10 androidTest files have their own (ConnectionInstrumentedTest ×2, Hosted* ×2…) | One `LoopbackHttp` test server (route -> response lambda, records requests/bodies) | Low |
| 3 | 21-24 | C3 | Promise-capture `call(expression)` (same as ConnectionInstrumentedTest/ClockAgentReview) | `WebViewTestDriver.call` | None |
| 4 | 43, 59 | C3 / T8 | Inline poll loops (`for(int i=0;i<100;i++){…;SystemClock.sleep(100);}`) and `SystemClock.sleep(1300)` for a recording length (intentional) | Shared poll; keep the 1.3 s record window | None |
| 5 | 25 | D8 | WAV header built on one 400-char line | Formatter | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 21-24 | ConnectionInstrumentedTest:38-47, ClockAgentReview:30-32, CloudDelegationCallback:22-27 | `WebViewTestDriver.call` |
| `wav()` | helper | 25 | synthetic audio builders in voice tests | keep or `AudioFixtures.wav` |
| `Fixture` | class | 26-37 | Hosted* `Fixture`, ConnectionInstrumentedTest peers | `LoopbackHttp` |

## Proposed end state
Same journey; loopback server and bridge-call helpers shared; production hook fields replaced by a testMocks-only seam.
Estimated 73 -> ~50 lines here (and −2 fields/2 branches in `AlphaVoiceCloudPlugin`).

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes CloudVoice`; production bundle/APK audit
(`scripts/audit-production-bundle.ts`, `verify-apks`) to confirm the hook is absent from flag-off builds.
