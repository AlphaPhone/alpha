# android/app/src/androidTest/java/ai/alphacompute/alphaphone/FlowInstrumentedTest.java
- Lines: 81 | Role: smoke journey in the real WebView: every main view mounts, a note is created/edited, survives activity recreation and is deleted. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:268` (`Flow: {}`), `scripts/owner/emulator-campaign-check.ts:42,57` (Assistant group / `h31-flagoff` batch `--classes …,Flow,…`). No test pins the source text (`FlowInstrumentedTest` hits elsewhere are `CameraFlow…`/`SettingsFlow…`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 9, 11-13 | A7 | Unused imports `Assume`, `JSONTokener`, `CountDownLatch`, `TimeUnit`, `AtomicReference` | Delete | None |
| 2 | 19-47 | B4 / C3 | All helpers take an unused `scenario` parameter (`eval(scenario, js){return NotesSecureFixture.evaluate(js);}`) and duplicate shared poll/click/input helpers | Drop the parameter; use `WebViewTestDriver.until`, `AppNavigation.open(view)`, `AppNavigation.setValue` | None |
| 3 | 38-43 | C3 | `input(selector,value)` React value-setter — the most general copy of this helper (handles input and textarea) | Promote this one to `AppNavigation.setValue(selector, value)` and reuse everywhere (CameraScan, ChatContinuity, ContactsFlow, Combined*, DeviceAction) | Low |
| 4 | 61-65 | T4 | Iterating all views overlaps `ShellInstrumentedTest`/`NoMockProduct` default classes (view mounting) | Keep: this is the only lifecycle-and-notes smoke in the h31 batch; acceptable overlap | — |
| 5 | 20 | D10 | Uses `NotesSecureFixture.evaluate` as general evaluator | `WebViewTestDriver.evaluate` | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `waitFor`/`ready`/`click`/`navigate`/`label` | helper | 22-47 | ~77 poll copies, AppNavigation | `WebViewTestDriver`/`AppNavigation` |
| `input` | helper | 38-43 | CameraScan:95, ChatContinuity:115, ContactsFlow:29-32, DeviceAction:32, Combined*:32 | `AppNavigation.setValue` |
| `saved(title)` | helper | 48-50 | `__notesEnvelope.records` queries in Combined*/DeviceAction | `NotesSecureFixture.note(title)` |

## Proposed end state
One test unchanged; imports and the scenario parameter removed; helpers shared. Estimated 81 -> ~45 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes Flow` (both variants).
