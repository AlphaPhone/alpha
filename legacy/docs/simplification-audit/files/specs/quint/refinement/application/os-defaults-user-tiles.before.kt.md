# specs/quint/refinement/application/os-defaults-user-tiles.before.kt
- Lines: 322 | Kind: vendored AOSP baseline (`packages/SystemUI/.../UserTileSpecRepository.kt` before the Alpha patch), harness input | Verdict: KEEP (consider MOVE)
- Covers: nothing by itself. `os-defaults.mjs` applies `android/aosp/branding/core-launcher/alpha-core-launcher.patch` to it, checks `beforeSha256`/`afterSha256` from `core-launcher/manifest.json:34-36` (hash matches: `4c83f0e2…`), then executes the patched `loadTilesFromSettingsAndParse`/`storeTiles` with the real `AlphaQsDefaultsPolicy`.
- Duplicates: `test/aosp-fresh-presets.test.py` reads the same baseline from `core-launcher/.cache/baseline/` (populated by `scripts/prepare-patched-native.ts`, network). Importers: only `os-defaults.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | AOSP source stored under `specs/quint/refinement/application/`. | Move to `android/aosp/branding/core-launcher/baseline/` next to the patch it belongs to, or read it from the fetched `.cache/baseline` when present (keeps offline runs working only if vendored). | Low. |
| 2 | 1 | licence | The copy starts at `package`; no Apache licence header. | Owner/legal check: confirm the pinned AOSP blob is header-less (hash says the bytes equal the manifest's before-image) or keep a NOTICE. | Low. |

## Proposed end state
Kept as the offline before-image for the QS defaults migration (D17 keeps `AlphaQsDefaultsPolicy`), stored with the AOSP branding patch.
