# android/app/src/main/java/ai/alphacompute/alphaphone/RendererRecoveryBudget.java
- Lines: 80 | Role: WebView renderer-loss policy (3 per 60 s, then 5 s back-off; native escape while HOME; background losses rebuild on start) and Settings-action choice for the escape view | Verdict: SIMPLIFY (small)
- Importers: `MainActivity` (6), `AlphaDeviceAppsPlugin:24` (`homeChoiceAction`). Text/path pins: `test/fixtures/RendererRecoveryBudgetTest.java` + `test/renderer-recovery-budget.test.mjs` (javac + MainActivity regexes), `test/home-role-recovery-contract.test.mjs`, `specs/quint/native/{RendererRecovery.qnt,manifest.json,README.md,recovery-vad-conformance.mjs}` (manifest pins `settingsAction`, `homeChoiceAction`), `specs/quint/refinement/native/{FinitePolicyTraces,MainActivityPorts,MainActivityRecoveryTraces,RendererBackgroundRebuildReplay}.java` and 7 `.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-25 | D7 | Re-declares `android.settings.SETTINGS`, `HOME_SETTINGS`, `MANAGE_DEFAULT_APPS_SETTINGS` as strings so javac can compile without Android. | Use `android.provider.Settings.ACTION_*` once the javac test is retired; until then keep. | Low. |
| 2 | 59-79 | D11 | Settings-action selection (`firstResolved`, `settingsAction`, `homeChoiceAction`) is not renderer-recovery policy; `AlphaDeviceAppsPlugin` reaches into this class for "Choose Home app". | Move the three helpers to a small `HomeSettings` helper (or next to `isCurrentHome`), used by `MainActivity` and `AlphaDeviceAppsPlugin`. | Low; Quint manifest pins names. |
| 3 | 75 | D4 | `settingsAction(resolves)` = `firstResolved(resolves, ACTION_SETTINGS)`. | Inline. | None. |
| 4 | 63-67 | D11 | `currentHome(...)` is a HOME-role helper, not budget logic. | Move with finding 2. | Low. |
| 5 | 5-18 | A8 | 14-line Javadoc incl. "No Android types: host-tested by javac." | Trim to the rules. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Action` | enum | 26 | — | here |
| `ACTION_*` Settings | const | 23-25 | `android.provider.Settings` | Android constants |
| `firstResolved` / `homeChoiceAction` | helper | 70-79 | `android/aosp/branding/provision/AlphaWelcome.java:55,122` picks HOME settings too (AOSP module, separate) | `HomeSettings` |
| `currentHome` | helper | 63-67 | `MainActivity.isCurrentHome` caller | `HomeSettings` / `AlphaHome` |

## Proposed end state
~50 lines of pure budget policy (`deaths`, `onLoss`, `decision`, `delay`); Settings/HOME helpers in a ~25-line sibling.

## Verification
`test/renderer-recovery-budget.test.mjs`, Quint `RendererRecovery` refinement, emulator HOME renderer-kill run.
