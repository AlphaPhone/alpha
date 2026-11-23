# Chunk android-01: android/aosp brand config and branding packet (part 1)

29 files, 1,805 lines now, about 1,110 after (about 695 removable). Per-file reports are under `docs/simplification-audit/files/android/aosp/`.
Main points: two hand-run Python test suites and their prepare/apply helpers duplicate CI-run Quint refinement coverage or are never run (T9/T4/T2). Pin and provenance files have no reader (B5). The Launcher3/LatinIME patches are not wired into any staging script, while their overlays are staged.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| android/aosp/brand.alphaphone.json | KEEP | 20 | 20 |
| android/aosp/branding/.gitignore | KEEP (absorbs sub-folder ignores) | 1 | 4 |
| android/aosp/branding/Android.bp | KEEP | 48 | 48 |
| android/aosp/branding/POWER-INVOCATION.md | DELETE (stale; fold 2 lines into README) | 21 | 0 |
| android/aosp/branding/README.md | SIMPLIFY (absorbs POWER/keyboard-dictation sections) | 68 | 65 |
| android/aosp/branding/branding.mk | KEEP | 9 | 9 |
| android/aosp/branding/core-launcher/.gitignore | MERGE into branding/.gitignore | 2 | 0 |
| android/aosp/branding/core-launcher/AlphaCoreLauncherPolicy.java | KEEP | 12 | 12 |
| android/aosp/branding/core-launcher/AlphaQsDefaultsPolicy.java | KEEP (−20 after pre-rename image retired) | 57 | 57 |
| android/aosp/branding/core-launcher/AlphaSharedStoragePolicy.java | KEEP | 13 | 13 |
| android/aosp/branding/core-launcher/README.md | SIMPLIFY | 17 | 10 |
| android/aosp/branding/core-launcher/SOURCE-INPUTS.json | SIMPLIFY (drop `url`) | 26 | 22 |
| android/aosp/branding/core-launcher/alpha-core-launcher.patch | KEEP (generated) | 327 | 327 |
| android/aosp/branding/core-launcher/manifest.json | SIMPLIFY (drop status booleans) | 59 | 51 |
| android/aosp/branding/core-launcher/prepare.py | SIMPLIFY | 227 | 205 |
| android/aosp/branding/core-launcher/test_policy.py | DELETE | 221 | 0 |
| android/aosp/branding/hidden-navigation-handle/.gitattributes | MERGE into branding/.gitattributes | 2 | 0 (+1 shared) |
| android/aosp/branding/hidden-navigation-handle/.gitignore | MERGE into branding/.gitignore | 3 | 0 |
| android/aosp/branding/hidden-navigation-handle/PROVENANCE.json | DELETE | 37 | 0 |
| android/aosp/branding/hidden-navigation-handle/README.md | SIMPLIFY | 40 | 20 |
| android/aosp/branding/hidden-navigation-handle/apply.py | DELETE (use system-entry/apply.py --manifest) | 45 | 0 |
| android/aosp/branding/hidden-navigation-handle/hidden-navigation-handle.patch | KEEP (unwired) | 28 | 28 |
| android/aosp/branding/hidden-navigation-handle/manifest.json | SIMPLIFY | 25 | 15 |
| android/aosp/branding/hidden-navigation-handle/prepare.py | DELETE (with its test) | 43 | 0 |
| android/aosp/branding/hidden-navigation-handle/test_hidden_handle.py | DELETE | 123 | 0 |
| android/aosp/branding/home-back-keyboard-inputs.json | DELETE (or reshape into a staging manifest under X1) | 47 | 0 (~30 under X1) |
| android/aosp/branding/home-back-keyboard.patch | KEEP (unwired; Javadoc misplacement) | 204 | 204 |
| android/aosp/branding/keyboard-dictation/README.md | MERGE into branding/README.md | 46 | 0 |
| android/aosp/branding/keyboard-dictation/source-inputs.json | DELETE | 34 | 0 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `sha` / `digest` | helper | core-launcher/prepare.py:16; hidden-navigation-handle/apply.py:13 | system-entry/apply.py:19, scripts/stage-alpha-os-branding.py `digest`, inline hashlib in hidden-navigation-handle/prepare.py:13,29,32,42 | shared `android/aosp/branding/aosp_inputs.py` (or scripts/lib Python helper if one is created) |
| pinned gitiles fetch loop | helper | core-launcher/prepare.py:20-33; hidden-navigation-handle/prepare.py:14-32 | system-entry/fetch.py:17-41 (hard-wired to frameworks/base) | `aosp_inputs.fetch_pinned(project, revision, rows, dest)` |
| symlink-free path walk | helper | hidden-navigation-handle/apply.py:19-21,30-32; hidden-navigation-handle/prepare.py:20-22,34-36 | system-entry/apply.py:30-33, system-entry/fetch.py:22-25 | `aosp_inputs.assert_no_symlink(root, relative)` |
| apply/admit tool | script | hidden-navigation-handle/apply.py:1-45 | system-entry/apply.py (already takes `--manifest`, used by core-launcher README:13) | system-entry/apply.py, optionally with a `requiredExistingResource` check |
| JDK/kotlinc discovery | helper | core-launcher/test_policy.py:11-35 | system-entry/portable_tools.py:java_binary | delete with test |
| `PACKAGE` "ai.alphacompute.alphaphone" | const | core-launcher/AlphaCoreLauncherPolicy.java:6; AlphaSharedStoragePolicy.java:6 | core-launcher/prepare.py:136,223; core-launcher/manifest.json:5; scripts/stage-alpha-os-branding.py:93; brand.alphaphone.json:5; app.config.json appId | Java constants stay (separate AOSP modules); Python reads `app.config.json` appId |
| `ALPHA` tile spec / `tile()` | const/helper | core-launcher/AlphaQsDefaultsPolicy.java:12,20 | literal in core-launcher/prepare.py:136 | prepare.py derives it from the app id |
| `LEGACY_ALPHA` | const | core-launcher/AlphaQsDefaultsPolicy.java:17 | `oldTile` in test_policy.py:141 | stays until the pre-rename image is retired |
| Android/Kotlin stubs | test fixtures | hidden-navigation-handle/test_hidden_handle.py:13-50; core-launcher/test_policy.py:53-112 | — | delete |
| status booleans (`compilation`, `imageBuilt`, `deviceQualified`, …) | const | core-launcher/manifest.json:52-58, prepare.py:224-226; hidden-navigation-handle/manifest.json:21-24 | system-entry/manifest.json, power-voice/manifest.json, scripts/stage-alpha-os-branding.py:191 record | delete where unread |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| core-launcher/test_policy.py | git grep `test_policy`: 0. Not in run-node-tests, python-suites or workflows. Predicate matrices duplicate `specs/quint/refinement/application/os-defaults.mjs:93,135,140`, which runs in CI via `test/quint-os-application-refinement.test.mjs`. The patch hash checks duplicate `stage-alpha-os-branding.py:56-78`. | High (only unique coverage is the FGS transition transplant; owner may keep it) |
| hidden-navigation-handle/test_hidden_handle.py | git grep: README only. Built on stubs, text assertions and a duplicate hash roundtrip. Unused `re` and `REPO`. | High |
| hidden-navigation-handle/prepare.py | Only consumer is test_hidden_handle.py (`.cache/staged`). | High once the test goes |
| hidden-navigation-handle/apply.py | Near-copy of system-entry/apply.py, which already takes `--manifest`. No caller. | High |
| hidden-navigation-handle/PROVENANCE.json | 0 readers for the file or its keys. It duplicates manifest.json. | High |
| keyboard-dictation/source-inputs.json | 0 readers. The `source-inputs.json` hits in scripts all point at `provision/source-inputs.json`. | High |
| home-back-keyboard-inputs.json | 0 readers (README:65 only). | High (unless X1 adopts it) |
| POWER-INVOCATION.md | 0 references. It claims an exported ACTION_ASSIST activity, but `AlphaAssistActivity` is `exported="false" enabled="false"`, asserted by test/aosp-cloud-power-defaults.test.mjs:24-30. | High |
| unread manifest status keys (core-launcher 7 keys, hidden-nav 4 keys) | git grep each key: only the writer and the file | High |
| `url` fields in core-launcher/SOURCE-INPUTS.json and hidden-navigation-handle/manifest.json | Rebuilt from the revision and path, then asserted equal (B3) | Medium |
| AlphaQsDefaultsPolicy v3 legacy-tile migration (`LEGACY_ALPHA`, lines 25-37, 52-53) | Migrates OS settings from the pre-rename image. Keep until the owner retires that image. | Low (owner decision) |

## Cross-file actions
- **X1: wire or document the Launcher3/LatinIME patches.** `home-back-keyboard.patch` and `hidden-navigation-handle.patch` are applied by no script. `scripts/stage-alpha-os-branding.py:103-108` still stages `overlay/packages/apps/Launcher3/res/values/alpha-navigation.xml`, `keyboard-overlay/.../alpha-keyboard.xml` and `branding.mk`, and those reference resources (`config_alpha_home_back_only`, `config_default_keyboard_theme`) that only the patches define. The fix needs coordinated edits to:
  - `scripts/stage-alpha-os-branding.py` (a generic `patch_plan(packet)` modelled on `core_policy_plan`)
  - `home-back-keyboard-inputs.json` (becomes a manifest with revision and patchSha256)
  - `hidden-navigation-handle/manifest.json`
  - `provision/source-inputs.json` (Launcher3/LatinIME revisions, if staging checks them)
  - `test/aosp-fresh-presets.test.py` (staged-plan expectations)
  - `branding/README.md` and `hidden-navigation-handle/README.md`
  - `specs/quint/refinement/application/os-source-staging.mjs`, if it models the staged file set

  When regenerating, also fix the misplaced Javadoc in `home-back-keyboard.patch:34-36`.
- **X2: one shared Python helper module** for the branding packets: sha256, the pinned gitiles fetch, and the symlink walk. Edits go to:
  - `core-launcher/prepare.py`
  - `hidden-navigation-handle/prepare.py` (if kept)
  - `system-entry/fetch.py`, `system-entry/apply.py` and `system-entry/prepare.py` (outside this chunk)

  `system-entry/portable_tools.py` is already imported cross-packet by `test/aosp-fresh-presets.test.py:8` and `system-entry/test_native_plan.py:3`. Either move it up to `branding/` or extend it in place.
- **X3: merge `hidden-navigation-handle/apply.py` into `system-entry/apply.py`.** Optionally add a `requiredExistingResource` check there. Then delete apply.py, update `hidden-navigation-handle/README.md:30-33`, and decide whether `hidden-navigation-handle/manifest.json:15-20` stays.
- **X4: drop unread status booleans.**
  - Remove them from `core-launcher/prepare.py:224-226` and regenerate `core-launcher/manifest.json`. That changes the manifest hash the staging record stores (`scripts/stage-alpha-os-branding.py:191`, `corePolicyManifestSha256`; informational only).
  - Remove them from `hidden-navigation-handle/manifest.json`.
- **X5: drop `url` from pin files.**
  - `core-launcher/SOURCE-INPUTS.json` together with `core-launcher/prepare.py:28-29`.
  - `hidden-navigation-handle/manifest.json` together with `hidden-navigation-handle/prepare.py:17-18`.
- **X6: one `.gitattributes` and one `.gitignore` in `android/aosp/branding/`.**
  - Fold in `hidden-navigation-handle/.gitattributes`, `system-entry/.gitattributes`, `core-launcher/.gitignore`, `hidden-navigation-handle/.gitignore` and `system-entry/.gitignore`.
  - Optionally drop the blank-context rewrite in `core-launcher/prepare.py:220`. That requires regenerating `alpha-core-launcher.patch` and `manifest.json` `patchSha256`, then re-running `test/quint-os-application-refinement.test.mjs`.
- **X7: README consolidation.** Fold `POWER-INVOCATION.md` and `keyboard-dictation/README.md` into `branding/README.md`. Trim the evidence disclaimers in `core-launcher/README.md` and `hidden-navigation-handle/README.md`. Remove the reference to the non-existent `builder/` directory (README.md:66-67).
- **X8: app id literal in Python.** Make `core-launcher/prepare.py:136,223` and `scripts/stage-alpha-os-branding.py:93` read `app.config.json` appId. The Java constants stay as they are.

## Text/path pins
- `test/aosp-cloud-power-defaults.test.mjs:5,13-15` regex-matches the `Android.bp` AlphaFrameworkOverlay block and `branding.mk` `PRODUCT_PACKAGES += AlphaFrameworkOverlay` (T1). Reformatting either file breaks it.
- `test/aosp-fresh-presets.test.py:6-13,59,78-87` byte-compares every staged branding file and loads `core-launcher` as CORE. It is hand-run; git grep found no runner.
- `specs/quint/application/manifest.json:3945-3947` lists the three core-launcher Java files as `sources`, and lines 3990-3991 list the stage/generate scripts.
- `specs/quint/refinement/application/os-defaults.mjs:13,148,153-162,175`:
  - hash-checks the three Java files, `manifest.json` and `alpha-core-launcher.patch`
  - slices `    private void grantAlphaSharedStorageDefault(` out of the patch text (T2/T10)
  - asserts `AlphaQsDefaultsPolicy.VERSION==3`

  It runs in CI via `test/quint-os-application-refinement.test.mjs`.
- `specs/quint/refinement/application/os-source-staging.mjs` references `core-launcher` and `stage-alpha-os-branding`.
- `scripts/stage-alpha-os-branding.py:52-93,103-108,191` reads the following and records the manifest hash:
  - `core-launcher/manifest.json` (revision, patch, patchSha256, files, targetAppId)
  - `Android.bp`, `branding.mk`, `secure-camera-inputs.json`
  - the `overlay/`, `keyboard-overlay/` and `manifests/` folders
- `android/aosp/product.json:6` (`brandConfig`) is read by `scripts/stage-aosp.ts`, `test/aosp-product-lock.test.mjs:25-81` (field regexes) and `test/verify-apks.test.mjs:37`. The upstream `vendor/eliza/packages/os/scripts/android/brand-config.ts` requires every field of `brand.alphaphone.json`.
- Generated-pair pin: `core-launcher/manifest.json` `afterSha256` pins the three Java files byte for byte. Any edit requires re-running `prepare.py --fetch` and committing the regenerated patch and manifest.
- `hidden-navigation-handle/test_hidden_handle.py:65,104` slices the patched source by Javadoc text, and `:116` asserts a literal line of `home-back-keyboard.patch`. Both go away if the test is deleted.

## New patterns
- **NEW-unwired-packet**: an OS source packet (patch, pin json, README, host test) that no staging or build script consumes, while dependent overlays are staged. Examples: `home-back-keyboard.patch`, `hidden-navigation-handle/`. Treatment: wire into the stage plan with a manifest, or delete. Never leave a README claiming it "binds" the image.
- **NEW-stale-design-note**: a markdown note describing behaviour the code and tests now contradict (`POWER-INVOCATION.md` vs disabled `AlphaAssistActivity`). Close to A8; treat the same way.
- **NEW-literal-split**: identity literals built with `String.join(".", "ai", "elizaresearch", "alphaphone")` or `['ai','elizaresearch','alphaphone'].join('.')` to avoid text scans (AlphaQsDefaultsPolicy.java:17, test_policy.py:141, test/host-speech-admission.test.mjs:44, test/resident-native-ci-admission.test.mjs:137). Use the literal unless a named scanner requires the split, and if it does, say so in a comment.
- **NEW-blank-context-rewrite**: core-launcher post-processes its generated patch (`' \n'` → `'\n'`) instead of using `.gitattributes *.patch -whitespace` like its sibling packets.

## Owner questions
1. Should `home-back-keyboard.patch` and `hidden-navigation-handle.patch` be applied by `scripts/stage-alpha-os-branding.py`? If they are applied outside the repo, by what process? Today the staged Launcher3/LatinIME overlays reference resources only these patches define.
2. Can the two hand-run Python suites be deleted: `core-launcher/test_policy.py` and `hidden-navigation-handle/test_hidden_handle.py` (with `hidden-navigation-handle/prepare.py`)? The FGS hide/restore transition in `test_policy.py` is the only off-device check of that Kotlin change. Delete it, or keep it wired into `test/python-suites.test.mjs`?
3. P-78: the OS default QS layout and `AlphaQsDefaultsPolicy` insert `custom(ai.alphacompute.alphaphone/.AlphaQuickSettingsTile)`. The framework overlay also makes Alpha the default assistant with long-press Power. Yet `AlphaQuickSettingsTile` and `AlphaAssistActivity` are disabled in the app manifest. Keep the OS-side defaults, or remove them along with the dormant app entries?
4. Is the pre-rename (`ai.elizaresearch.alphaphone`) OS image still on any phone that will take an OS update? If not, the v3 legacy-tile migration in `AlphaQsDefaultsPolicy` (about 20 lines, plus Quint model tests) can go.
5. Is `test/aosp-fresh-presets.test.py` meant to run in CI? It is the only staged-plan check for the branding packet, and no runner references it.
