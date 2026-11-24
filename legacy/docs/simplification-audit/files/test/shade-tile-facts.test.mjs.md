# test/shade-tile-facts.test.mjs
- Lines: 150 | Kind: transplant (`// tile-facts:begin/end` region of `native-adapter.ts` imported as a `data:` module with `vendor/eliza/plugins/plugin-native-system/src/settings.ts` type-stripped beside it) + source-text (MainActivity, AlphaDevicePlugin and two vendor Java files) | Verdict: DELETE (carry 2 cases to `journeys/home-shell.spec.ts`, standalone variant)
- Covers: Quick-settings tiles show on/off only from native facts, hand off to their own Android page, name a broader page honestly, and refresh when Android's own shade closes. Duplicates: `test/browser/settings-truth.production.spec.ts:146` (launcher Home draws no Alpha shade/tiles); `test/browser/dev-display.spec.ts`/`design.spec.ts` render tiles in dev. Callers/importers: `npm test` glob only; reads `vendor/eliza`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | T2/D7 | Region markers exist for this test; the shared module is copied out of `vendor/eliza` by text. | Delete markers with it. | Low |
| 2 | 66-99, 100-114, 131-150 | T1/T5 | Regexes Java method bodies (`openSettings`, `onWindowFocusChanged`), counts `ACTION_SETTINGS` occurrences (= 3), and parses upstream `SystemSettingsPages.java` / `SystemFacts.java`. | Delete; upstream owns its allowlist and facts. | Low |
| 3 | 15-65, 115-128 | T3 | Unit cases of `honestTiles`/`tileFactsFromSnapshot`/`switchValue`/`handoffGate`. | Carry: (a) with an empty snapshot no tile is pressed or "On/Off"; (b) tapping Wi-Fi calls `AlphaDevice.openSettings({page:"wifi"})`. | Med |

## Proposed end state
File deleted. Two cases in `journeys/home-shell.spec.ts` on the standalone/dev shade (the launcher variant has no Alpha tiles),
using the native fake for `AlphaDevice.snapshot` and recording `openSettings`.
