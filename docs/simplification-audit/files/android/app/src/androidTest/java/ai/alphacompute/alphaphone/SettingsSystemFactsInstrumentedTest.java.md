# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SettingsSystemFactsInstrumentedTest.java
- Lines: 82 | Role: read-only checks that the device snapshot (upstream `SystemFacts.read` + `AlphaDevicePlugin.appFacts`) matches Android's own answers; plus two pure-function tests of upstream `SystemFacts` switch mappings and `SystemSettingsPages.actions`. | Verdict: SIMPLIFY
- Importers: none. Registry `SettingsSystemFacts` (`scripts/android-instrumentation.ts:177`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-41 | T5 / T3 | `switchMappingsNeverGuess` tests upstream pure functions `ai.eliza.plugins.system.SystemFacts.wifiSwitch/binarySwitch/adapterSwitch/interruptionName` with constants — no device state, no Alpha code. | Delete here (belongs to upstream plugin-native-system unit tests). | Low; confirm upstream covers them. |
| 2 | 71-81 | T5 / T3 | `everySettingsPageHasASpecificFirstChoice` tests upstream `SystemSettingsPages.actions` table. | Delete here (upstream). | Low. |
| 3 | 45 | — | `reportedFactsMatchThisAndroidImage` reproduces `AlphaDevice.snapshot()` merging by hand (`SystemFacts.read` + `appFacts`) instead of calling the plugin. | Keep but call one package-private `AlphaDevicePlugin.snapshotFacts(context)` used by the plugin too, so the test cannot drift from production. | Low (main change). |
| 4 | 22-27 | C3 | `shell()` copy (25 files). | `TestShell.run`. | None. |
| 5 | 68 | C6 | Allowed snapshot keys listed inline (17 keys). | Keep (it is the contract under test). | — |
| 6 | 29-40, 75, 80 | D8 | Fully-qualified `ai.eliza.plugins.system.SystemFacts` repeated 20 times. | Import it (moot after 1-2). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `shell` | helper | 22-27 | 25 androidTest files | `TestShell` |

## Proposed end state
One test, `reportedFactsMatchThisAndroidImage` (~35 lines), using a production `snapshotFacts` entry point and the shared shell helper.

## Verification
`node scripts/android-instrumentation.ts --classes SettingsSystemFacts` (both variants). Upstream unit tests for the two deleted methods.
