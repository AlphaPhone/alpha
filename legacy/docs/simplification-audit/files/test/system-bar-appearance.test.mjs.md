# test/system-bar-appearance.test.mjs
- Lines: 20 | Kind: unit (real `installSystemBarAppearance` with a fake `Shell` class and stub plugin) + source-text (test 3) | Verdict: REWRITE as one case in `journeys/settings.spec.ts`; DELETE test 3
- Covers: the drawn theme drives Android status/navigation bar icon appearance once per change, only on native, and a failed native call is retried on the next update. Duplicates: none (`home-overlay-stability.spec.ts` only mentions system-bar clearance). Callers/importers: run by `npm test` (`scripts/run-node-tests.ts`, glob `test/*.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-20 | T1 | Regexes `main.tsx` for the exact install call and `AlphaDevicePlugin.java` for the two `setAppearanceLight*` calls. | Delete. The Java side is device evidence; the install is proven by the journey. | none |
| 2 | 3-16 | T3 | Monkey-patched fake component lifecycle (`componentDidMount/Update`) instead of the real shell. | Rewrite through the dev test-mocks build with a recording `AlphaDevice` bridge fake: switch Light/Dark/System in Settings, assert `setSystemBarAppearance` received `[false,true,…]` once per change. | low |
| 3 | 14-16 | — | Retry-after-failure case is the only non-obvious behaviour. | Carry: bridge fake rejects first call, next theme render resends. | low |

## Proposed end state
File deleted. `journeys/settings.spec.ts` gains "theme changes tell Android bar icons once per change, and a failed call
is retried" using the shared native-bridge fake (needs a recording `AlphaDevice.setSystemBarAppearance` in the harness).
