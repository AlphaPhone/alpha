# android/aosp/branding/core-launcher/AlphaQsDefaultsPolicy.java
- Lines: 57 | Role: SystemUI Quick Settings layout migration: replace three known stock layouts with Alpha defaults once (v2) and rename the pre-rename Alpha tile in saved layouts (v3) | Verdict: KEEP (owner decision may shrink it)
- Importers: `prepare.py:205` (copied into patch); patched `UserTileSpecRepository.kt` (prepare.py:106-132) uses `VERSION`, `VERSION_SETTING`, `ALPHA`, `migrate`. `shouldMigrate` is public but only called from `migrate` and tests. Text/path pins: `manifest.json:28-31` afterSha256; embedded in `alpha-core-launcher.patch:124-183`; `specs/quint/application/manifest.json:3946`; `specs/quint/refinement/application/os-defaults.mjs:32-33,45,93,148,154,175` (reflection on the compiled class, asserts `VERSION==3`); `test_policy.py:140-161`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17, 25-37, 52-53 | A1 (exception) | `LEGACY_ALPHA = tile(String.join(".", "ai", "elizaresearch", "alphaphone"))` and the v3 in-place rename. This migrates OS Secure Settings across an image update from the retained pre-rename image, which can carry over (research android.md:178-179 says keep). | Keep while any phone runs the pre-rename image. Once the owner retires that image, delete `LEGACY_ALPHA`, lines 25-37 (v3 loop), line 52-53, set `VERSION = STOCK_LAYOUT_VERSION` and update `os-defaults.mjs:93` + Quint model tests `reviewedCustomTileMigratesInPlaceTest`, `reviewedStockSurvivesIdentityMigrationTest`. ~20 lines. | Medium (OS settings on updated phones) |
| 2 | 12, 21 | A4 / owner | `ALPHA = custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile)` — the target service is declared `android:enabled="false"` in `android/app/src/main/AndroidManifest.xml:94` (P-78, no enabler). SystemUI shows nothing for a disabled custom tile, so the default layout carries a dead slot, and `shouldMigrate`/`migrate` gate on `defaults.contains(ALPHA)`. | Owner decision on P-78. If the tile is deleted, the whole stock-layout migration needs redesign (it keys on ALPHA being in defaults); if kept, no change. | Medium |
| 3 | 17 | NEW (literal split to dodge identity scans) | `String.join(".", "ai", "elizaresearch", "alphaphone")` instead of the literal; same trick in `test_policy.py:141`, `test/host-speech-admission.test.mjs:44`, `test/resident-native-ci-admission.test.mjs:137`. | Use the plain literal if no scanner forbids it in source (git grep found none in scripts/test scanning source text); otherwise keep with a comment naming the scanner. | Low |
| 4 | 40 | D7 | `shouldMigrate` is `public` only for tests; production calls it only from `migrate`. | Keep public: `os-defaults.mjs` and Quint model use it. No change. | — |
| 5 | 42-45 | D10 | Stock layouts as comma strings split at runtime; fine at this size. | None. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ALPHA` / `tile()` | const/helper | 12, 20-22 | literal `'custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile),'` in `prepare.py:136` | stays; prepare.py should build its string the same way |
| `LEGACY_ALPHA` | const | 17 | `oldTile` in `test_policy.py:141` | stays until pre-rename image is retired |
| stock layout strings | const | 43-45 | `prepare.py:138,141` (2 of 3 strings, as SystemUI config anchors) | stays |

## Proposed end state
Today: unchanged (57 lines). After pre-rename image retirement: ~37 lines (v2 stock migration only).

## Verification
`node --test test/quint-os-application-refinement.test.mjs`; Quint `specs/quint/application` model for QS defaults; re-run `prepare.py` after any edit (manifest afterSha256 + patch).
