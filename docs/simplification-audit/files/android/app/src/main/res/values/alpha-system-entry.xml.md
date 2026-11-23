# android/app/src/main/res/values/alpha-system-entry.xml
- Lines: 25 | Role: two unrelated string groups: Quick Settings tile copy (lines 2-5) and the resident-runtime foreground-notification copy (lines 6-24). | Verdict: SPLIT (and shrink if the dormant tile is deleted)
- Importers: tile strings → `AlphaQuickSettingsTile.java` and `AndroidManifest.xml:94` (`@string/alpha_quick_settings_label`); runtime strings → generated `ElizaAgentService` through `android/consumer-host.json:144-164` (`residentHost.notification.strings`, all 19 names map 1:1 to lines 6-24).
  Text/path pins: `test/alpha-system-entry.test.mjs:15-17,44,60,106,123-127` (reads this path, builds an `R` stub from every `<string name=…>`, asserts runtime names and absence of upstream copy); `test/android-host.test.mjs:159-160` (regex per descriptor name against this path); Quint `specs/quint/refinement/native/assistant-entry-platform.mjs` (tile string ids). Name collision: AOSP has its own `android/aosp/branding/system-entry/product-overlay/values/alpha-system-entry.xml` (SystemUI overlay, pinned by `scripts/stage-alpha-os-branding.py:113`, `test/aosp-fresh-presets.test.py:79-80`) — a different file with the same name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-5 | A4 / P14 | `alpha_quick_settings_*` serve only `AlphaQuickSettingsTile`, declared `android:enabled="false"` with no enabler (android research P14). | Delete with the tile if the owner retires P-78 entries; update `test/alpha-system-entry.test.mjs` tile tests and the Quint assistant-entry model. | Medium (owner decision) |
| 2 | 6-24 | D11 | Runtime notification copy has nothing to do with "system entry"; the file name collides with the AOSP SystemUI overlay of the same name. | Move lines 6-24 to `values/alpha-runtime-notification.xml`; update the two test paths. | Low |
| 3 | 6-24 | C6 | Every name is `alpha_runtime_` + snake_case of its descriptor key (`runningDetail` → `alpha_runtime_running_detail`), repeated in `consumer-host.json:145-163`. Mapping lives in the upstream descriptor schema. | Leave (upstream schema); optional upstream change: derive names from a prefix. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `alpha_runtime_*` (19) | const (strings) | 6-24 | names repeated as values in `consumer-host.json:145-163` | `values/alpha-runtime-notification.xml` |
| `alpha_quick_settings_*` (4) | const (strings) | 2-5 | — | delete with the tile, or keep here |

## Proposed end state
`alpha-runtime-notification.xml` with the 19 runtime strings (~21 lines). `alpha-system-entry.xml` either deleted (tile retired) or 6 lines of tile copy. User-visible copy unchanged byte-for-byte.

## Verification
`node --test test/alpha-system-entry.test.mjs test/android-host.test.mjs`; APK build; resident notification visible on emulator with the same text.
