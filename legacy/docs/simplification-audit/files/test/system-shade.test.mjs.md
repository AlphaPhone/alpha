# test/system-shade.test.mjs
- Lines: 168 | Kind: source-text (tests 1, 8) + unit of the upstream shared shade policy (tests 2-7, 9) + unit with fake DOM of real `installSystemShade` (test 10) | Verdict: REWRITE test 10 into `journeys/home-shell.spec.ts`; DELETE the rest; MOVE the manifest rule to `scripts/verify-apks.ts`
- Covers: pull-down on empty launcher Home asks for Android's notification shade; ordinary app/assistant/covered Home/scrolled/editable/keyboard/status-band starts do not; fallback copy never claims "opened"; only the launcher flavor requests `EXPAND_STATUS_BAR`. Duplicates: the policy (`emptyHomeShadePull`, `overflowPullDecision`, `shadeSurface`, `shadeFallback`) lives in `.eliza/client-features/plugins/plugin-native-system/src/client/shade.ts`, which the file itself says has "its own tests upstream" (line 6). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-22 | T1 | Regexes `system-shade.ts` for imports and for the absence of policy copies. | Delete. | none |
| 2 | 28-77, 96-103 | T5 | Unit tests of the upstream policy at the pin (T5: re-testing upstream). | Delete; upstream owns them. | low |
| 3 | 79-94 | T1 | Regexes both AndroidManifests, vendor `SystemShade.java`, `AlphaDevicePlugin.java`, `AlphaSystemPlugin.java`. | The real release rule ("standalone APK has no `EXPAND_STATUS_BAR`, launcher APK has it") moves to `verify-apks` on built APK manifests; Java regexes deleted. | low |
| 4 | 105-168 | T3 | Fake `Element`, `document`, `getComputedStyle` globals swapped in and out; tsx import of the real module. | Rewrite as touch journey (`hasTouch`): on launcher Home a downward drag over an overflowing Home calls `openNotificationShade`; with Notes open or on lock screen it does not. | low |
| 5 | 5 | A8 | "Issues #416 and #417" comment. | Goes with the file. | none |

## Proposed end state
File deleted. `journeys/home-shell.spec.ts`: one launcher-profile touch case (pull on Home asks the bridge fake; app open or
lock screen does not; a scrolled/editable start does not). `scripts/verify-apks.ts` asserts the flavor permission split on
the built manifests. Upstream policy stays tested upstream.
