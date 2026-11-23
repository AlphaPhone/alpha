# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WebViewTestDriver.java
- Lines: 98 | Role: Shared instrumentation helper: run an action on the live exact-type Activity, evaluate JS in its Capacitor WebView with a bounded main-thread dispatch, inject Back, cancel DocumentsUI, and navigate the host document. | Verdict: SIMPLIFY (and grow into the single shared driver)
- Importers: 122 androidTest files (`evaluate` 111, `withActivity` 40, `evaluateSensitive` 8, `pressBack` 8, `navigateHostDocument` 5, `cancelDocumentPicker` 3; public `evaluate(Class,String)` only `AssistantInstrumentedTest:22-25`), plus `android/app/src/testMocks/androidTest/.../BrowserAutofillInstrumentedTest.java`. Text/path pins: none outside android (grep 0 in scripts/test/specs).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5, 9 | A7 | Unused imports `android.os.Handler`, `android.os.Looper`, `java.util.concurrent.TimeUnit` (each appears only on its import line). | Delete. | None. |
| 2 | 21-28 vs 83-90 | C3 | The four-stage live-Activity scan (`for(Stage stage:new Stage[]{RESUMED,STARTED,PAUSED,STOPPED})...if(activity.getClass()==type&&!isFinishing()&&!isDestroyed())`) is written twice in this file and copied in ~25 other test files (`git grep -l getActivitiesInStage`: 27). | Extract `private static <T extends Activity> T liveActivity(Class<T> type)` (main-thread only) and make `evaluate` use `withActivity`; expose a `liveActivity` for callers like `VoicePermissionDenied`/`WorkflowNoticeTap`. | Low; preserve "exact type, never a subclass". |
| 3 | 67-97 | C3 (missing shared API) | The driver lacks the three helpers every caller re-declares: poll-until (88 private copies), promise `call` (12 copies) and `click` by aria-label. | Add `until(String js,long ms)`, `call(String expr,long ms)` → `JSONObject`, `click(String label)` here; then delete the copies (research P20 "fold helper copies into WebViewTestDriver"). | Low per caller, large total diff — do in one mechanical commit per cluster. |
| 4 | 35-48 | D11 | `cancelDocumentPicker`/`pressBack` are UI-automation helpers, not WebView helpers. | Keep here (name is the only issue) or move to a small `AndroidSystemUi` helper alongside `AndroidShade`. | None. |
| 5 | 36-58 | D8 | Fully qualified `android.app.UiAutomation`, `android.view.KeyEvent` inline 6×; 250-char KeyEvent constructors. | Add imports; one `key(int action,long down)` local. | None. |
| 6 | 73-76 | A4/P14-link | Public `evaluate(Class<? extends MainActivity>,String)` has one caller, `AssistantInstrumentedTest` (dormant `AlphaAssistActivity`, research P14). | Keep while `VoicePermissionDenied` can use it (see that report); otherwise delete with the Assistant test if P-78 is deferred. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| live-activity scan | helper (inline) | 21-28, 83-90 | `VoicePermissionDeniedInstrumentedTest:33-37`, `WorkflowNoticeTapInstrumentedTest:27-31,51,137`, 24 more files | private `liveActivity` here |
| `evaluate` | helper | 67-97 | 62 local `js/eval/evaluate` wrappers (research P20) | here (canonical) |
| `pressBack` | helper | 49-58 | none | here |

## Proposed end state
One `liveActivity` scan; `withActivity`, `evaluate` (+ sensitive variant), `until`, `call`, `click`, `pressBack`, `cancelDocumentPicker`, `navigateHostDocument`. Unused imports gone. About 110 lines (grows ~15 lines while removing ~150 duplicate helper lines across callers).

## Verification
Compile the androidTest APK (`npm run android:build:local`) and run `node scripts/android-instrumentation.ts` (default classes) on both variants; the driver change touches every UI instrumentation class, so also run the workflow (`scripts/android-workflow-native.ts`) and permissions (`scripts/test-native-permissions.ts`) campaigns.
