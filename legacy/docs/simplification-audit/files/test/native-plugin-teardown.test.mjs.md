# test/native-plugin-teardown.test.mjs
- Lines: 376 | Kind: source-text (self-described "Source-shape guard (class S)": masks and brace-parses every Java file in `android/app/src/main/java/ai/alphacompute/alphaphone`, six vendor browser classes, every vendor plugin `android/src/main/java` tree and `SystemPlugin.kt`, then regex-checks executor hand-offs, launches, receivers and specific method text); last test runs `ReviewedCopies` on the JVM | Verdict: DELETE tests 1-10; MERGE test 11 (lines 372-376) into `test/integration/android-jvm.test.mjs`
- Covers: a Capacitor call that arrives after `handleOnDestroy` cannot crash the process by submitting to a stopped executor or launching through a destroyed activity; receivers/callbacks are unregistered; late browser/maps calls are refused. Duplicates: `test/plugin-worker-guard.test.mjs` runs `PluginWorkers.submit` on the JVM; `LateLaunch` behaviour is exercised in Quint `note-bridge-platform.mjs`/`app-info-handoff-platform.mjs`; `ReviewedCopiesTest` only here. Callers/importers: `npm test` glob; sole importer of `test/fixtures/ReviewedCopiesTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-130, 231-259 | T1 | A hand-written Java lexer/brace parser with its own self-tests (lines 141-150, 265-268): test machinery testing itself (T5). | Delete. | Medium: the "late call after destroy" crash class loses its static guard. |
| 2 | 108-115, 283 | T1 | REVIEWED exception counts and the exact list of permission-declaring plugins: every edit of those files must edit this test. | Delete. | Low |
| 3 | 165-207, 336-347 | T1 | Exact-text regexes of method bodies (`BrowserDownloads`, `BrowserTabHostPlugin`, `AlphaMapsTransportPlugin`). | Delete. | Low |
| 4 | 278-370 | T1, T5 | Regexes over vendor `PermittedPhotosPlugin`, `DeviceLibraryPlugin`, `TelephonyPlugin`, `LocalSpeechBridgePlugin`, `AddressBookPlugin`, `SystemPlugin.kt`. | Delete; upstream follow-up. | Low |
| 5 | 372-376 | - | Real JVM run of `ReviewedCopies`. | Keep in android-jvm suite. | None |

## Proposed end state
File deleted. The rule it guards becomes structural: every plugin executor hand-off goes through
`PluginWorkers.submit` and every activity launch through `LateLaunch.ask` (product cleanup, D-pattern C4). Owner
question: keep a 20-line release lint (`scripts/` grep for `.execute(`/`.submit(` on plugin fields outside
`PluginWorkers`) in verify, or rely on review plus the emulator destroy/recreate instrumentation.
