# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SystemShadeInstrumentedTest.java
- Lines: 128 | Role: (1) outcome mapping of upstream `SystemShade.expand` with fake status-bar objects; (2) EXPAND_STATUS_BAR declared/held only by the launcher flavor; (3) on test-mocks builds, launcher Home asks Android for its shade (bridge call and a real pull), standalone never does. | Verdict: SIMPLIFY
- Importers: none. Uses `AndroidShade` helper. Registry `SystemShade` (`scripts/android-instrumentation.ts:215`). Referenced in comments by `NotificationsInstrumentedTest:19,29` and `android/app/src/launcher/AndroidManifest.xml:53`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-59 | T5 / T4 | `everyOutcomeIsReportedAndOnlyAnAcceptedCallIsOpened` unit-tests upstream `ai.eliza.plugins.system.SystemShade` with `FakeStatusBar`/`RefusingStatusBar`; `test/system-shade.test.mjs:84` itself says the mapping is "plugin-native-system SystemShade, tested there". | Delete the method and the two public fake classes. | None. |
| 2 | 31-35 | C3 | `js`/`until` copies. | Shared driver helpers. | None. |
| 3 | 22, 70-72 | A8 (minor) | Issue numbers "(#416, #417)" in the class comment; the registry note repeats them. | Drop issue numbers, keep the rule. | None. |
| 4 | 91 | T8 | `SystemClock.sleep(1000)` before asserting the shade stayed closed (negative wait). | Keep; name it. | — |
| 5 | 61-67 | — | Flavor/permission check is real APK evidence. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `FakeStatusBar`, `RefusingStatusBar`, `platform()` | type/helper | 39-46 | upstream SystemShade tests | delete |
| `js`, `until`, `context` | helper | 31-36 | ~70 copies | `WebViewTestDriver` |

## Proposed end state
Two tests (~95 lines): flavor permission and the Home pull journey.

## Verification
`node scripts/android-instrumentation.ts --classes SystemShade` and `--test-mocks --classes SystemShade` on both variants.
