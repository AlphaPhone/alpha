# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ImageCapabilitiesInstrumentedTest.java
- Lines: 51 | Role: on an ordinary (non-AOSP-image) APK, telephony roles, dialer hand-offs, Contacts methods and dev `?start=` routes all fail closed. | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:176` registry entry.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | C3 | Private `until(String)` polling `WebViewTestDriver.evaluate("Boolean("+e+")")`; ~13 copies across androidTest. | Shared `WebViewTestDriver.until(expression, timeoutMs)`. | Low |
| 2 | 21 | P13 | Calls `AlphaImageCapabilities.aospImage(...)` directly; android research P13 proposes merging `AlphaImageCapability`/`AlphaImageCapabilities`. | Update this call in the same change as the merge. | Low |
| 3 | 28, 30 | D8 | 600+ char JS probe strings in Java. | Split into named JS snippets when touched. | None |
| 4 | 28 | A1? | `legacy:await Promise.all(['phone','messages','contacts'].map(action=>p.DailyApps.perform({action})))` asserts the old DailyApps actions fail. This is a denial check of an upstream action set, not a legacy reader; keep while `DailyApps.perform` accepts those action names. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until(String)` | helper | 14-18 | `NoMockProductInstrumentedTest.until`, `NotesDocumentInstrumentedTest.until`, `NoteAudioInstrumentedTest.until`, `MapsInstrumentedTest.until`, `LauncherHomeInstrumentedTest.until`, `LocalSpeechBridgeInstrumentedTest.until`, `InboxDraftInstrumentedTest.until` ... | `WebViewTestDriver.until` |
| ActivityMonitor counting launches | helper | 24-26 | `NotesDocumentInstrumentedTest.java:104-105` (identical monitor) | `WebViewTestDriver.countLaunches()` |

## Proposed end state
Same two tests; shared `until` and launch-monitor helper; about 45 lines.

## Verification
Default-build instrumentation with `--classes ImageCapabilities` (both variants).
