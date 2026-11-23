# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SettingsRolesInstrumentedTest.java
- Lines: 227 | Role: launcher-only HOME role journey in Android's real role dialog (decline, accept), then proves a single live MainActivity keeps its page/draft across the role grant, repeated HOME presses and an explicit start; plus a Calendar/App-permissions row check. | Verdict: SIMPLIFY
- Importers: none. Registry `SettingsRoles: { homeRole: "requests" }` (`scripts/android-instrumentation.ts:184`, `:421`); `scripts/owner/emulator-campaign-check.ts:40,58`; referenced in `LauncherHomeInstrumentedTest:32-33` comment. Text/path pins: `test/android-instrumentation-runner.test.mjs:78-79,215,282,319,341-353` (registry name and HOME-role ordering), `test/browser/settings-device-facts.spec.ts:6` (comment).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 204-226 | T4 / T9 | `calendarRowMatchesRuntimeGrant` asserts the same App-permissions summary as `SettingsNativeInstrumentedTest.appPermissionsHandoffAndGrantReadback` (inline copy of `expectedSummary`, lines 219-222). Its `settingsCalendar` argument is passed by no runner (grep outside androidTest: 0 hits); without it, it is a weaker duplicate. The extra "Contacts is not presented" check (224) is PRD shape. | Delete the method; move the Contacts-absent assertion into `SettingsNativeInstrumentedTest`. | Low. |
| 2 | 32-39, 66 | C3 | `shell`, `js`, `until`, `text`, `button`, `settings`, `back` — same helpers as SettingsNative/SettingsFlow/SettingsCrashLog. | Shared `TestShell` / `WebViewTestDriver` / `AppNavigation.openSettings()`. | None. |
| 3 | 49-65 | C3 | `dialogNode` and `exactDialogNode` are two polling searches over the foreign window differing only in exact vs contains match. | One `foreignNode(label, exact, polls)`. | None. |
| 4 | 86-89, 71 | C3 | `systemRecords()` and `foreground()` parse `dumpsys activity activities` (11 files do variants). | `TestShell.topResumed()` + `TestShell.activityRecords(component)`. | Low. |
| 5 | 133 | C3 | Composer setter snippet (21 copies). | `AppNavigation.setComposer`. | None. |
| 6 | 41-48, 158-162, 170-180 | — | Long measured-behaviour comments (API 36 timings, round 7). These explain *why* the waits exist; keep but trim dates/round names (A8: "campaign of 2026-10-14", "round 7"). | Keep the reason, drop the history. | None. |
| 7 | 192 | T8 | `SystemClock.sleep(1000)` after `am start` before polling `assertOneLiveInstance` (which already polls 15 s). | Delete the sleep. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `shell`, `js`, `until`, `text`, `button`, `settings`, `back` | helper | 32-39, 66 | SettingsNative:13-16,22; SettingsFlow:22-33; SettingsCrashLog:26-28 | shared helpers |
| `dialogNode`, `exactDialogNode`, `click(node)` | helper | 49-67 | `SelectedDocumentInstrumentedTest.find/press:74-89`, `ShareFlowAssertions.nodes:63` | `UiNodes` helper |
| `instances()`, `systemRecords()`, `foreground()`, `pressHome()`, `awaitWindowFocus()`, `assertOneLiveInstance()` | helper | 73-122 | `ActivityInstanceSelectionInstrumentedTest` / `LauncherHomeInstrumentedTest` likely overlap (single-instance checks) — not verified line by line | keep local unless LauncherHome uses the same |
| `HOME`, `PROBE`, `DRAFT`, `TOP`, `NAVIGATION_SETTLED`, `DIALOG_POLLS` | const | 29, 48, 70-71, 101 | `DRAFT` pattern also in Rotation | keep |

## Proposed end state
One test (the HOME role journey), ~150 lines on shared helpers. Registry name `SettingsRoles` and `homeRole: "requests"` unchanged.

## Verification
`node scripts/android-instrumentation.ts --owned-emulator --variants launcher --home-role --classes SettingsRoles,LauncherHome`;
`node --test test/android-instrumentation-runner.test.mjs`.
