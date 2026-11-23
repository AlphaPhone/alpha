# android/app/src/androidTest/java/ai/alphacompute/alphaphone/HostedResultsLifecycleInstrumentedTest.java
- Lines: 23 | Role: constructs `AlphaHostedResultsPlugin` with no bridge, destroys it, and checks seven queued `PluginCall` stubs are rejected with a fixed message. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:269` (`HostedResultsLifecycle: {}`); the runner test requires every class to have a registry entry, so the entry must go with the file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-16 | T3 | Unit test with a stub: `private static final class Call extends PluginCall { ... super(null,"AlphaHostedResults","closed-fixture","test",new JSObject()) }` and `new AlphaHostedResultsPlugin()` with no bridge/Activity. Nothing Android-specific is exercised; it asserts the literal `"Result bridge closed; reopen the app to continue."` (`AlphaHostedResultsPlugin.java:24`). | Delete the file and the registry entry. | Low |
| 2 | 17-22 | T3/P18 | It checks the per-plugin "closed bridge" workaround (`PluginWorkers.submit`), which the android research (P18) proposes to fix once in a base class; the test pins the per-plugin copy. | Cover after-destroy rejection once, for the shared base helper, if a test is wanted. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Call extends PluginCall` | type | 10-16 | other stub `PluginCall` subclasses in androidTest (grep `extends PluginCall`) | delete |

## Proposed end state
File deleted (0 lines); `HostedResultsLifecycle: {}` removed from `CLASS_REGISTRY`.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (registry/source consistency); `npm run android:build:local` (androidTest compiles).
