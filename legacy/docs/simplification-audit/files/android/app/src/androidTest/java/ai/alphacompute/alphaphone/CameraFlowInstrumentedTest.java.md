# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CameraFlowInstrumentedTest.java
- Lines: 169 | Role: real CameraX preview, scan-not-published, MediaStore capture, Photos viewer/share/ask, and camera permission denial/retry | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-native-permissions.ts:28-43` cases `camera` (method `denyingCameraAllowsExplicitRetryWithoutFakePreview`, gate `cameraPermissionTest=true`) and `camera-capture` (method `photoCapturePublishesReadableImageAndShowsRealViewer`, gate `cameraCapture=1`). Text/path pins: `test/native-permission-runner.test.mjs:9,57` (method names), `test/fixtures/isolated-native-campaign.mjs:114`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 131-150 | T9 / A7 | `cameraDeniedForeverRecoversThroughAndroidSettings` is selected by no runner: the `camera` case names only `denyingCamera…` (grep `cameraDeniedForever`: 1 hit, this file). It also mutates permission flags with `pm set-permission-flags`. | Add a `camera-denied-forever` case to `scripts/test-native-permissions.ts` (and the runner test), or delete the method (−20 lines). | Low |
| 2 | 30-40, all callers | A7 | `eval/until/click/clickText/askAlpha/closeScan/navigate` all take `BoundedActivityScenario<MainActivity> s` and never use it (`eval` ignores it at 31). ~45 call sites pass `s`. | Drop the parameter everywhere. | Low |
| 3 | 117-128 | C3 | `permissionButton` accessibility BFS by view-id suffix. | `NativeUiDriver.clickById(suffix)`. | Low |
| 4 | 59-65 | C3 | `preview(View)` PreviewView walk = `CameraLatencyInstrumentedTest.previewView:56-60`. | One `CameraTestViews.previewView(root)`. | Low |
| 5 | 129-130 | C3 | `shell/resumed` via dumpsys = `BrowserShareInstrumentedTest.foreground:20`. | `DeviceShell.topResumed()`. | Low |
| 6 | 66-71 | C3 | `ownedImages()` MediaStore query = `CameraLatency.ownedImages:101-105` (Uri vs id). | Shared helper in `PhotosTestFixture` (exists in androidTest). | Low |
| 7 | 49, 102 | C3 | Textarea value-setter snippet. | `WebViewTestDriver.setValue`. | Low |
| 8 | 105 | A6 (check) | "Production suggestions do not invent a contact" asserts `'Maya'` is absent — a guard against prototype fixture data leaking; keep while `apps/app/src/prototype` fixtures exist, delete when they are moved out (D6). | Revisit with prototype cleanup. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until/click/navigate` | helpers | 30-58 | every UI test | `WebViewTestDriver`/`AppNavigation` |
| `preview/nativePreview` | helpers | 59-65 | CameraLatency.previewView | `CameraTestViews` |
| `ownedImages` | helper | 66-71 | CameraLatency.ownedImages | `PhotosTestFixture` |
| `permissionButton` | helper | 117-128 | NativeUiDriver family | `NativeUiDriver` |
| `shell/resumed` | helpers | 129-130 | BrowserShare.foreground | `DeviceShell` |

## Proposed end state
Three methods (or two if #1 deletes), no dead scenario parameter, shared preview/MediaStore/accessibility/shell helpers.
Est. ~140 lines.

## Verification
`node scripts/test-native-permissions.ts camera APP.apk TEST.apk OUT` and `… camera-capture …`; `node --test test/native-permission-runner.test.mjs`.
