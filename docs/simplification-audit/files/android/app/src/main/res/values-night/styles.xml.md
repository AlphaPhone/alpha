# android/app/src/main/res/values-night/styles.xml
- Lines: 15 | Role: dark-mode copies of `AppTheme` and `AppTheme.Launch` (black window/system bars, dark bar icons off) so a cold start does not flash white. | Verdict: MERGE into `values/styles.xml` (leave a 5-line `values-night/colors.xml`)
- Importers: resource overlay of `AppTheme` / `AppTheme.Launch` (manifest application/activity theme). Text/path pins: none (grep `values-night`, `styles.xml`: 0 hits in test/scripts/specs).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-14 | C5 | Full re-declaration of both styles; only six values differ from `values/styles.xml`: `windowLightStatusBar`/`windowLightNavigationBar` (`false`), `statusBarColor`, `navigationBarColor`, `windowBackground`, `windowSplashScreenBackground` (`#000000`). `fontFamily`, `colorAccent`, `windowDrawsSystemBarBackgrounds`, `windowSplashScreenAnimatedIcon`, `postSplashScreenTheme` are copied. | Define `<color name="alpha_surface">` (`#FFFFFF` / `#000000`) and `<bool name="alpha_light_bars">` (`true` / `false`) in `values/colors.xml` and `values-night/colors.xml`; reference them from the single styles in `values/styles.xml`; delete this file. | Low (theme attrs accept references) |
| 2 | 5 | C6 | `colorAccent #0000FF` literal (also in `values/styles.xml:3`, `alpha-launcher.xml:3`, `drawable/app_icon.xml:4`). | `@color/alpha_brand`. | Low |
| 3 | 2-3 | — | Comment ties `#000000` to `apps/app/src/product/alpha-product-registration.ts` `dark.bg` (verified: line 35 `bg: "#000000"`). Keep the comment on the colour resource. | Move comment. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AppTheme` (night) | style | 4-10 | `values/styles.xml:2-8` | single style in `values/styles.xml` |
| `AppTheme.Launch` (night) | style | 11-14 | `values/styles.xml:12-15` | same |

## Proposed end state
File deleted; replaced by `values-night/colors.xml` (~5 lines: `alpha_surface #000000`, `alpha_light_bars false`, with the renderer-source comment).

## Verification
APK build; emulator cold start in dark and light system theme (no white flash, correct bar icon contrast).
