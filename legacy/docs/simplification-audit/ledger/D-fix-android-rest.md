# D-fix-android-rest

Fixes for confirmed review defects in the Android / embedding-host part of the simplification.

## Findings 1 and 2: provision completion test broken by the applyPalette move (same defect)

Re-checked and confirmed. `AlphaWelcome.java` `Completion` now calls
`AlphaFreshPresets.applyPalette(activity)`. The harness in `test/aosp-fresh-presets.test.py`
copies `Completion` verbatim, but it still stubbed `applyPalette` on `AlphaAppearance`. As a
result `test_actual_setup_completion_retries_roles_and_preserves_existing_presets` failed to
compile with `cannot find symbol AlphaFreshPresets.applyPalette`. Production Java behaves the
same, because only the method moved and its body did not change.

Fix: in `test/aosp-fresh-presets.test.py`, moved the `applyPalette` stub into the
`AlphaFreshPresets` stub and deleted the now-empty `AlphaAppearance` stub. The test assertions
are unchanged.

Verification: ran `python3 -I test/aosp-fresh-presets.test.py`. That test now reports `ok`. The 7
remaining errors are all `FileNotFoundError` for the missing local AOSP source cache
`android/aosp/branding/provision/.cache/`. They are caused by the environment and are not
related to this fix.

## Finding 3: stale `remapBuildPath` in the Toolchain type

Re-checked and confirmed, cosmetic only. `build-toolchain.json` no longer has the field and
nothing reads it, because `--remap-build-path` is passed unconditionally.

Fix: in `scripts/build-embedding-host.ts`, changed the type to
`type Toolchain = {ndk:string;cmake:string;engineRepository:string};`. I left
`test/strict-build-inputs.test.mjs` unchanged, because this branch did not change it, nothing
reads its fixture keys, and the result does not depend on them. It can still be tidied
separately (U-O3).

Verification: `npx tsc --noEmit` reports 0 errors. `npx tsc --noEmit -p tsconfig.scripts.json`
reports no errors outside `vendor/`, and none in `scripts/build-embedding-host.ts`. The `vendor/`
errors were there before and are not part of this change.
