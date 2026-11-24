# C-android-01 (android/aosp brand config and branding packet, part 1)

All 29 listed files existed at start (no earlier stage touched this chunk). No renderer, Java or B1-B4 migration
map site falls in these files; types.md / helpers.md rows for this chunk are Python/JSON helpers whose shared home
(U-O1 `packet.py`) is stage F work.

## Done

- `core-launcher/SOURCE-INPUTS.json`: dropped the four `url` fields (B3, X5); `prepare.py` builds the URL.
- `core-launcher/prepare.py`: removed the `assert row['url'] == expected` self-check (B3); removed the seven unread
  status keys from the generated manifest and `imageBuilt` from the stdout summary (B5, X4).
- `core-launcher/manifest.json`: removed the same seven unread keys (`compilation`, `imageBuilt`, `deviceQualified`,
  `ownerCustomLayoutsPreserved`, `ownerExplicitStorageModesPreserved`, `appPrivateStorageGranted`,
  `crashRecoveryAndVoiceControlsChanged`). Regenerated output proven byte-identical (see Verification). Readers
  (`stage-alpha-os-branding.py`, `os-defaults.mjs`, `os-source-staging.mjs`, `aosp-fresh-presets.test.py`,
  `test_policy.py`) read only `revision`, `project`, `patch`, `patchSha256`, `files`, `targetAppId`. The staging record's
  `corePolicyManifestSha256` changes value (informational, computed at run time, no committed copy).
- `hidden-navigation-handle/manifest.json`: removed `url` (B3, X5), `requiredExistingResource.owner` and the four
  unread keys `renderOnly`, `quickSwitchBehaviorChanged`, `compilation`, `deviceQualified` (B5, X4). `apply.py` still
  reads `requiredExistingResource.{path,name,defaultValue}`; `test_hidden_handle.py` reads `files`, `patch`,
  `patchSha256` only.
- `hidden-navigation-handle/prepare.py`: removed `assert row['url'] == url` (B3).
- `hidden-navigation-handle/PROVENANCE.json`: deleted (B5; 0 readers, duplicates manifest.json).
- `keyboard-dictation/source-inputs.json`: deleted (B5; 0 readers; every `source-inputs.json` reader targets
  `provision/`).
- `POWER-INVOCATION.md`: deleted (NEW-STALE-NOTE/A8: claimed an exported ACTION_ASSIST activity). Its overlay facts
  and source pin folded into `branding/README.md` "Power and assistant defaults" without the stale claim (X7).
- `keyboard-dictation/README.md`: folded into `branding/README.md` "Keyboard dictation" (X7, C7) and deleted;
  empty `keyboard-dictation/` folder removed.
- `branding/README.md`: replaced the non-existent `builder/` reference and "local builder" with
  `scripts/stage-alpha-os-branding.py` (A8); stated that staging does not apply `home-back-keyboard.patch` or read
  its inputs file (NEW-unwired-packet, factual only; Q-AOSP-1 not decided).
- `core-launcher/README.md`: removed the duplicated evidence disclaimer sentence (B5).
- `hidden-navigation-handle/README.md`: replaced the duplicated evidence disclaimer with the fact that the staging
  script does not apply this patch (B5, NEW-unwired-packet).
- `branding/.gitignore`: now `/generated/` + `.cache/` (X6). Deleted `core-launcher/.gitignore` and
  `hidden-navigation-handle/.gitignore` (`__pycache__/` is covered by root `.gitignore:45`; nothing writes `*.log`).
- `branding/.gitattributes`: created with `*.patch -whitespace` (X6); deleted `hidden-navigation-handle/.gitattributes`.
  `system-entry/.gitattributes`, `system-entry/.gitignore` and `provision/.gitignore` belong to android-02 and were
  not touched.

## Deleted tests and formal artefacts

None.

## Pins left broken

None. Quint `os-defaults.mjs` / `os-source-staging.mjs` list `core-launcher/manifest.json` only as an
unchanged-during-run input and read `files`; they pass (see Verification).

## Skipped

- `core-launcher/test_policy.py`, `hidden-navigation-handle/test_hidden_handle.py` and `hidden-navigation-handle/prepare.py`
  deletion: Open Q-AOSP-6.
- `home-back-keyboard-inputs.json` deletion/reshape, wiring of `home-back-keyboard.patch` and
  `hidden-navigation-handle.patch` (X1), Javadoc fix in `home-back-keyboard.patch:34-36` (needs regeneration): Open Q-AOSP-1.
- `hidden-navigation-handle/apply.py` merge into `system-entry/apply.py` (X3, U-O1): needs edits to an android-02 file
  and a new `requiredExistingResource` check there; tied to Q-AOSP-1. Kept.
- Shared Python helper (`sha`, gitiles fetch, symlink walk; X2/U-O1): new shared module across packets, stage F.
- App id literal from `app.config.json` in `prepare.py:136,223` (X8): needs the matching `stage-alpha-os-branding.py`
  change (not owned); left for a coordinated change.
- Blank-context rewrite in `core-launcher/prepare.py` (NEW-BLANK-CONTEXT): requires regenerating
  `alpha-core-launcher.patch` and `patchSha256`; data-format change of a pinned artefact. Kept.
- `AlphaQsDefaultsPolicy` `LEGACY_ALPHA` / v3 migration: Open owner question (pre-rename image, android-01 Q4).
  `String.join(".", "ai", "elizaresearch", "alphaphone")` literal split (NEW-LITERAL-SPLIT): any Java byte change
  needs `prepare.py --fetch` regeneration of patch + manifest `afterSha256` and touches Quint-pinned source; kept.
- `ALPHA` tile / P-78 (disabled `AlphaQuickSettingsTile`): Open owner question (D7 keeps Power/assistant).
- `core-launcher/README.md:17` previous-package paragraph: tied to the LEGACY_ALPHA owner question.
- `brand.alphaphone.json`, `Android.bp`, `branding.mk`, the three Java files, both `.patch` files: KEEP verdicts; no
  in-file finding applicable.

## Verification

- `python3 -I prepare.py` run on a scratch copy of `core-launcher/` (edited `prepare.py`, `SOURCE-INPUTS.json`, the
  three Java files) using the main checkout's existing `.cache/baseline` (no network): output
  `alpha-core-launcher.patch` and `manifest.json` are byte-identical (`cmp`) to the committed files in the worktree.
- `hidden-navigation-handle/prepare.py`: not run (no cached baseline; would fetch from the network). Change is a
  one-line assert removal; parsed with `ast.parse`.
- `node --test test/aosp-cloud-power-defaults.test.mjs`: 3/3 pass.
- `node --test test/quint-os-application-refinement.test.mjs`: 3/3 pass (OSDefaults, OSProvisioning, OSSourceStaging).
- `git check-ignore -v`: `.cache/` under core-launcher and hidden-navigation-handle ignored by `branding/.gitignore`;
  `__pycache__/` by root `.gitignore:45`.
- git grep for `POWER-INVOCATION`, `PROVENANCE.json` (hidden-nav), `keyboard-dictation/`, every removed manifest
  key: no remaining readers outside docs/simplification-audit.
- No Gradle, tsc or bundle audit run: no renderer or app Java file in this chunk. `test/aosp-fresh-presets.test.py`
  not run (needs external `ALPHA_FRESH_PRESET_INPUTS`/assets).
