# android/app/src/main/res/values/alpha-launcher.xml
- Lines: 4 | Role: single colour `alpha_launcher_background` (#0000FF) for the adaptive icon background. | Verdict: MERGE into `values/colors.xml` (rename `alpha_brand`)
- Importers: `drawable-v26/app_icon.xml:3`. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | C6 | Same blue literal in `styles.xml:3` and `values-night/styles.xml:5` (`colorAccent`), `drawable/app_icon.xml:4`, `consumer-host.json:142` (`0xff0000ff`, upstream schema needs a literal). | Rename to `alpha_brand`, move into a `values/colors.xml` together with `alpha_surface`; reference it from both themes. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin | Proposed home |
|---|---|---|---|---|
| `alpha_launcher_background` | const (color) | 3 | `#0000FF` ×4 | `values/colors.xml` as `alpha_brand` |

## Proposed end state
File removed; colour lives in `values/colors.xml` (~6 lines with `alpha_surface`, `alpha_light_bars`).

## Verification
APK build; launcher icon visual check.
