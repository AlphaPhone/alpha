# android/app/src/androidTest/java/ai/alphacompute/alphaphone/TextScaleInstrumentedTest.java
- Lines: 59 | Role: the Settings Text size slider changes native WebView text zoom and real Notes heading glyph height; survives activity recreation and (phased) process restart. | Verdict: SIMPLIFY
- Importers: none. Registry `TextScale` and `DEFAULT_CLASSES` (`scripts/android-instrumentation.ts:149,354`) → CI instrumentation lane; `scripts/test-native-restart.ts:21-22` (`textScaleProcessRestartPhase`, arg `textScalePhase`). Text/path pins: `test/android-instrumentation-runner.test.mjs:30` (class name), `test/fixtures/isolated-native-campaign.mjs:18`. Uses `AlphaDevicePlugin.textScalePercent/effectiveTextZoom` (package-private main statics).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-19 | C3 | `js`, `until`, `open(view)` copies. | Shared driver helpers (`AppNavigation.open(view)`). | None. |
| 2 | 24 | C3 | Input value-setter snippet (`HTMLInputElement.prototype,'value'`) — same family as the composer setter in 21 files. | `WebViewTestDriver.setInput(selector,value)`. | None. |
| 3 | 50-55 | C3 | Restart-phase prepare/verify/cleanup with a JSON fixture file — same shape as SelectedDocument/SettingsFlow phases. | Shared `RestartFixture`. | Low; keep `textScalePhase` and file name `text-scale-fixture.json`. |
| 4 | 28 | D7 | Reads `AlphaDevicePlugin.textScalePercent`/`effectiveTextZoom` statics directly; acceptable white-box check of the persisted preference. | Keep. | — |
| 5 | 28, 34 | D8 | Dense one-liners. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`, `until`, `open` | helper | 17-19 | ~70 | shared |
| `setSlider`, `zoom`, `headingHeight`, `restore` | helper | 20-34 | none | keep |

## Proposed end state
~50 lines on shared helpers; names and phase args unchanged.

## Verification
CI instrumentation lane (default classes); `node scripts/test-native-restart.ts text-scale …`.
