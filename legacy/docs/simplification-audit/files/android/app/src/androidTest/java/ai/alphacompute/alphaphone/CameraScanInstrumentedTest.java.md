# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CameraScanInstrumentedTest.java
- Lines: 268 | Role: device journeys for Camera scan: CameraX document capture/retake/draft/SAF PDF export, "Keep photo" publishing rule, three-page searchable PDF through SAF and process recreation. | Verdict: SIMPLIFY
- Importers: none (JUnit class). Calls helpers on another test class: `new SelectedDocumentInstrumentedTest().fixtureBytes(...)` (144, 223) and `.selectDocument(...)` (179, 229).
  Text/path pins: `scripts/android-instrumentation.ts:216` (`CameraScan: {}`), `scripts/test-native-permissions.ts:46-49` (`testClass: "CameraScanInstrumentedTest"`, `method: "directDocumentCameraRetakeDraftAndPdf"`, `gate: "cameraDocument"`), `scripts/owner/emulator-campaign-check.ts:47` (Media group), `PosterCalendarJourneyInstrumentedTest` references it. `test/native-permission-runner.test.mjs` parses the test-native-permissions scenario table (method name must stay).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-49 | C3 / T7 | Private copies of the WebView poll/click helpers: `eval(js)` aliases `WebViewTestDriver.evaluate`; `until(js,millis)` is the 77th private poll loop in androidTest; `click(label)`, `clickText(text)`, `dialog(label)` | Replace with one `WebViewTestDriver.until(js, ms, diag)` and `AppNavigation.clickLabel/clickText/dialog` helpers shared by all instrumentation classes | Low; failure diagnostics (42) must be passed as the `diag` supplier |
| 2 | 95 | C3 | React controlled-input write `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Scan this')…` duplicated in ChatContinuity, Flow, DeviceAction, Combined*, ContactsFlow | `AppNavigation.setValue(selectorExpr, text)` | Low |
| 3 | 144, 179, 223, 229 | NEW (test class used as helper library) | `new SelectedDocumentInstrumentedTest().fixtureBytes(...)` / `.selectDocument(...)` instantiate another @Test class to reach helpers | Move `fixtureBytes` and `selectDocument` into a non-test `DocumentPickerDriver` (or `WebViewTestDriver`) | Low; SelectedDocumentInstrumentedTest keeps calling them |
| 4 | 64-87 | C3 | `nativeSave` hand-rolls a BFS over `AccessibilityNodeInfo`; same BFS appears in `DailyAppsInstrumentedTest.confirmReminderDeletion` (52-65) and `ClockAgentReviewInstrumentedTest.find` (40) | One `UiNodes.find(predicate, timeout)` helper (or use UiAutomator `UiDevice.findObject(By.res(...))`, already used in CloudSignInAuthorization) | Low |
| 5 | 88, 90 | C3 | `shell(command)` duplicates `AccessibilityViewsInstrumentedTest.shell(` (called from 2 other classes) | Put `shell` in `WebViewTestDriver` / a `DeviceShell` helper | Low |
| 6 | 253-262 | B1 | `catch(java.util.zip.DataFormatException notFlate){/* An image or uncompressed stream. */}` while scanning streams | Keep (documented, intended fallback for non-Flate streams) | — |
| 7 | 138-199 | D8 | 60-line method with dense chained statements (152-176) | Split into named steps (`captureTwoPages`, `retakeFirst`, `resumeDraft`, `exportAndVerify`) when touched | Low |
| 8 | 220, 223 | D8 | Several declarations packed per line (`ContentResolver resolver=…;String run=…;List<Uri> fixtures=…;Set<Long> before=null;long started=…`) | Formatter pass | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval` | helper | 39 | 60 androidTest files define `js/eval/evaluate(String)` | delete; call `WebViewTestDriver.evaluate` |
| `until(js,ms)` | helper | 40-44 | ~77 files (e.g. ClockHandoff:22, ConnectionInstrumentedTest:30, ConnectionRoutes:29, HomeCalendarCard:34) | `WebViewTestDriver.until` |
| `click`/`clickText`/`dialog` | helper | 45-49 | ChatContinuity:42, ClockHandoff:23, ContactsFlow:26, FlowInstrumentedTest:29, CombinedAgent:21 | `AppNavigation` |
| `ownedImages` | helper | 50-57 | MediaStore owner queries in Photos* tests | keep local (camera/photos only) |
| `page(text)` | helper | 58-63 | bitmap fixture builders in Photos tests | keep local |
| `nativeSave` | helper | 64-87 | SelectedDocument/PdfViewer DocumentsUI drivers | `DocumentPickerDriver` |
| `shell` | helper | 88 | `AccessibilityViewsInstrumentedTest.shell` | shared `DeviceShell.run` |
| `findCameraPreview`/`streamingPreview`/`captureScreen` | helper | 99-130 | none found | keep |

## Proposed end state
Keep all three @Test methods (they are the only device evidence for scan capture, Keep-photo publishing and SAF export).
Delete the private `eval/until/click/clickText/dialog/shell` helpers and the React value-setter in favour of shared driver
methods; move `nativeSave` + `selectDocument` + `fixtureBytes` into one non-test `DocumentPickerDriver`. Format the
file. Estimated 268 -> ~215 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes CameraScan` (both default methods) and the
`camera-document` scenario of `node scripts/test-native-permissions.ts` (secondary user, `cameraDocument=1`);
`node --test test/native-permission-runner.test.mjs test/android-instrumentation-runner.test.mjs`.
