# android/app/src/main/res/values/styles.xml
- Lines: 16 | Role: light `AppTheme`, Capacitor's `AppTheme.NoActionBar`, and the splash `AppTheme.Launch`. | Verdict: SIMPLIFY (absorb the night copy)
- Importers: `AndroidManifest.xml` application/activity themes (`AppTheme.Launch`); `AppTheme.NoActionBar` is applied at runtime by Capacitor `BridgeActivity.onCreate` (`setTheme(R.style.AppTheme_NoActionBar)`, `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeActivity.java:25-26`) — `MainActivity extends BridgeActivity` (`MainActivity.java:22`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-11 | — (correction) | Research listed `AppTheme.NoActionBar` as an unreferenced delete candidate. It is live: this app-level style overrides the Capacitor library's `AppTheme.NoActionBar` (parent `Theme.AppCompat.NoActionBar`, white-only) that `BridgeActivity` sets on every create. Deleting it would drop Alpha's colours/DayNight after launch. | Keep the name. | High if deleted |
| 2 | 10 | B4 | `<item name="windowActionBar">false</item><item name="windowNoTitle">true</item>` repeat what the parent already provides (`AppTheme` → `Theme.AppCompat.DayNight.NoActionBar`). | Reduce to `<style name="AppTheme.NoActionBar" parent="AppTheme" /> <!-- Capacitor BridgeActivity applies this name -->`. | Low |
| 3 | 2-8, 12-15 | C5 | Duplicated with `values-night/styles.xml` (six values differ). | Replace the literals with `@color/alpha_surface` and `@bool/alpha_light_bars`; delete the night style file (see its report). | Low |
| 4 | 3 | C6 | `colorAccent #0000FF` = `alpha_launcher_background`. | `@color/alpha_brand` (renamed launcher colour). | Low |
| 5 | 3-5, 13 | D8 | Two `<item>`s per line. | One per line when editing. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AppTheme` | style | 2-8 | `values-night/styles.xml:4-10` | here, colour/bool refs |
| `AppTheme.Launch` | style | 12-15 | `values-night/styles.xml:11-14` | here |
| `AppTheme.NoActionBar` | style | 9-11 | Capacitor library style of the same name (intentional override) | here |

## Proposed end state
~14 lines (one item per line): `AppTheme` using `@color/alpha_surface`, `@bool/alpha_light_bars`, `@color/alpha_brand`; empty `AppTheme.NoActionBar` override with a one-line comment naming `BridgeActivity`; `AppTheme.Launch` using `@color/alpha_surface`. Night variant only in `values-night/colors.xml`.

## Verification
APK build; emulator cold start light/dark; `verify-apks`.
