# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaSystemPlugin.java
- Lines: 79 | Role: Capacitor `ElizaSystem` subclass: network status, App-info hand-off and Alpha's role/launcher policy overrides. | Verdict: SIMPLIFY
- Importers: Registered in `MainActivity`; `AlphaDeviceAppsPlugin`; renderer `apps/app/src/native.ts` (`getNetworkStatus`, `openAppInfo`), `apps/app/src/runtime/connection-ui.tsx:366`, `apps/app/src/main.tsx:192`. Text/path pins: `specs/quint/{application,native}/manifest.json`; `specs/quint/refinement/{application/app-info-handoff-composition.mjs,native/AppInfoHandoffProbe.java,AppInfoHandoffTraces.java,app-info-handoff*.mjs}`; `test/aosp-image-capability.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/system-shade.test.mjs`, `test/browser/native-speech-fixture.ts`; androidTest `AppInfoInstrumentedTest`, `LauncherAppsInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-49 | A4 | `isAssistantLaunch` override recognises `AlphaAssistActivity.EXTRA_ASSISTANT`, an Activity that is disabled (P-78). | Delete the override with AlphaAssistActivity (cross-file P-78 set). | low |
| 2 | 39-41 | P18 | Three `LateLaunch.ask(call,()->super.x(call))` overrides. | Move to a single Alpha base / upstream base fix (cross-file). | low |
| 3 | 45-46, 51 | D5/P13 | `BuildConfig.IS_LAUNCHER` read in three overrides. | Move launcher-only policy into a `src/launcher` / `src/standalone` flavor class (e.g. `FlavorPolicy.LAUNCHER`) used here. | low |
| 4 | 24-38 | B1 | `catch(RuntimeException unavailable){/* Unknown connectivity must be decided by the real transport. */}` | Specified fallback; keep. | none |
| 5 | 25-33, 57 | D8 | Fully-qualified `android.net.*` / `com.getcapacitor.JSObject` inline; `malformedText` called three times in one condition. | Imports; loop over the three keys. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Network status, openAppInfo and policy overrides remain; assistant override and LateLaunch boilerplate gone; ~66 lines. Estimated lines after: 66.

## Verification
androidTest AppInfo/LauncherApps; `test/system-shade.test.mjs`, `test/aosp-image-capability.test.mjs` (source regexes).
