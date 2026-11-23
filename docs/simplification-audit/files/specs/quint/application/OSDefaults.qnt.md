# specs/quint/application/OSDefaults.qnt
- Lines: 69 | Kind: Quint model (live; Java/Kotlin compile-and-run harness) | Verdict: KEEP
- Covers: AOSP core-launcher defaults: QS layout migration commits version 3 only after the layout write; owner choices survive; default appop never overrides an owner deny. Duplicates: Kotlin fixture os-defaults-user-tiles.before.kt (token replacement) — complementary, not duplicate. Callers/importers: manifest row (3 android/aosp/branding/core-launcher Java sources); harness specs/quint/refinement/application/os-defaults.mjs (compiles the real policy Java with stub Android classes via test/fixtures/jvm-tools.mjs + kotlin-tools.mjs); wrapper test/quint-os-application-refinement.test.mjs; application README

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-25 | A1 (kept) | `legacy-custom` / version<3 migration is an OS-image settings migration (AlphaQsDefaultsPolicy), which RECOMMENDATIONS D17/Q-LEG-2 explicitly keeps. | Keep. | M if deleted |
| 2 | harness | - | Harness compiles and runs the real Java policy; it does read files via readFileSync to write stub sources, not to slice product code. | Keep. Runtime cost: needs JDK + kotlinc (slow); belongs in an AOSP/OS lane path-filtered on android/aosp/**. | L |
| 3 | 44-48 | B5 | `coreLauncherScopeTest` checks a pure predicate of the model against itself (no state transition). | Optional: fold into a harness case. | L |

## Proposed end state
Unchanged. Run only when `android/aosp/branding/**` or this model/harness changes.
