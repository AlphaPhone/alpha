# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SettingsCrashLogInstrumentedTest.java
- Lines: 87 | Role: (1) unit-style check of upstream `CrashLog` (class-only recording, renderer kinds, cap); (2) two-process real crash → readback → Settings › About › Problem log. | Verdict: SIMPLIFY
- Importers: none. Registry `SettingsCrashLog: { campaign: … }` (`scripts/android-instrumentation.ts:298`) — the generic runner refuses the class; `scripts/test-native-restart.ts:85-86` runs only `realCrashSurvivesRestartAndShowsInSettings` (arg `crashLogPhase`). Method 1 runs only under `--all`. Text/path pins: `test/android-instrumentation-runner.test.mjs:560-562,612` (class name, method name, arg, phases `prepare/crash/readback/cleanup`), `test/fixtures/isolated-native-campaign.mjs:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-51 | T5 / T3 | `forcedUncaughtExceptionIsRecordedByClassOnlyAndReadBackFromDisk` exercises only upstream `ai.eliza.plugins.system.crash.CrashLog` (`handler`, `recordRenderer`, `MAX_ENTRIES`) with a synthetic thread; no Alpha code. It is reachable only through `--all` (campaign classes are refused by name). | Delete here; the privacy rule (no message/stack on disk) belongs in upstream CrashLog tests. The real-crash method keeps the end-to-end check incl. "No content in Settings". | Low; confirm upstream has a CrashLog privacy test before deleting (owner/upstream). |
| 2 | 26-28 | C3 | `js`, `until`, `button(label)` copies. | Shared driver helpers. | None. |
| 3 | 66-70 | — | `crash` phase sleeps 10 s expecting death, then `fail`. | Keep (process death is the point). | — |
| 4 | 24 | — | `SECRET` contains a fake phone/email to prove redaction. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`, `until`, `button` | helper | 26-28 | SettingsNative `label:15`, SettingsRoles `button:38`, ~70 pollers | `WebViewTestDriver` |
| `last(entries,source)` | helper | 29 | none | keep |

## Proposed end state
One phased test (~45 lines): prepare/crash/readback/cleanup, Settings readback and the exit-reason check. Method/arg/phase names unchanged.

## Verification
`node scripts/test-native-restart.ts crash-log APP.apk TEST.apk OUTPUT`; `node --test test/android-instrumentation-runner.test.mjs`.
