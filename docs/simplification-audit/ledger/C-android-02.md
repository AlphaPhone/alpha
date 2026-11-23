# C-android-02 — AOSP branding overlays, keyboard overlay, power-voice, provision, system-entry

All paths are under `android/aosp/branding/`. All 51 listed files still existed at start; none was skipped as deleted.

## Done
- `keyboard-overlay/.../drawable/*.xml` (8 files): namespace prefix `ns0:` renamed to `android:`. The URI is unchanged, so
  aapt output is the same (D8).
- `overlay/frameworks/base/core/res/res/values/config.xml`: a two-line comment about the product debate shortened to
  what the values do (A8). Values are unchanged.
- `power-voice/README.md`: removed the history paragraphs (the stallion builder result and the d4fbb prototype) and kept a
  one-line source-only status (A8). The packet itself stays under D7.
- `power-voice/manifest.json`: removed the unread status flags `sourceOnly`, `compiled` and `deviceQualified` (B5,
  NEW-UNREAD-JSON-FIELDS). Nothing reads `power-voice/` (git grep).
- `provision/AlphaAppearance.java`: moved `applyPalette` to `AlphaFreshPresets`, now taking `Context` (D11). Imported
  `ColorStateList`. Uses `AlphaWelcome.BACKGROUND` (C6). Dropped the unused `Settings` import.
- `provision/AlphaFreshPresets.java`: now owns `applyPalette(Context)`. Its private `nonempty` was replaced by a static
  import of `AlphaFreshSetupPolicy.nonempty` (C3), which keeps the literal `nonempty(selected())` that
  `test/aosp-fresh-presets.test.py` asserts.
- `provision/AlphaFreshSetupPolicy.java`: one package-private `nonempty` replaces three inline
  `x != null && !x.isEmpty()` copies (C3). Control flow is unchanged.
- `provision/AlphaWelcome.java`: added `static final int BACKGROUND` for the three `Color.rgb(5,5,5)` uses plus the one in
  AlphaAppearance (C6). Removed the `foreground` alias (D4). Imported `ColorStateList`. Calls
  `AlphaFreshPresets.applyPalette`. The `fail(int)` signature, the Quint anchors and the `Completion` fields are unchanged.
- `provision/README.md`: removed the tombstone sentence about historical staging scripts (A8). Moved the
  MANAGE_ROLE_HOLDERS fact here from `source-inputs.json` and adjusted the sentence that pointed at the removed notes.
- `provision/source-inputs.json`: removed the unread keys `settingsUpdateAuthority`, `homeRoleAuthority`,
  `productIcon.reuse` and `productIcon.assetPreservation` (B5). Kept `productIcon.geometry`, because
  `test/aosp-fresh-presets.test.py:105-109` reads it.
- `provision/.gitignore`, `system-entry/.gitignore`, `system-entry/.gitattributes`: deleted (C5). The parent
  `android/aosp/branding/.gitignore` now has `.cache/` and the parent `.gitattributes` has `*.patch -whitespace` (both
  added by C-android-01). Root `.gitignore:45` covers `__pycache__/`. `git check-ignore` and `git check-attr` confirm the
  same effect.
- `system-entry/PROVENANCE.json`: deleted (B5). It has no reader (git grep `PROVENANCE`). Its copy of the patch hash goes
  with it.
- `system-entry/manifest.json`: removed the unread `files[].new`, `identity.*` except `source`,
  `productOverlay.resources/destination` and the status flags (B5). Readers: `apply.py`, `prepare.py`,
  `test_native_plan.py` and `scripts/stage-alpha-os-branding.py:110` use only the keys that remain.
- `system-entry/prepare.py`: removed the always-true `OUT` assert (B4) and the unread `.cache/alpha-native-system-entry.patch`
  and `.cache/manifest.json` writes, along with the `manifest` list that existed only for them (B5). Kept the patch-hash
  assertion and the `.cache/product-overlay` write, because `test_native_plan.py:99` reads it.
- `system-entry/SOURCE-INPUTS.json` + `fetch.py`: removed the 22 per-row `url` fields. `fetch.py` now derives the URL as
  `base + path`, which is exactly what it used to assert (B3/C3). The redirect check is kept.
- `system-entry/README.md`: removed the "OS17 runtime correction and next image" QA narrative (A8). Changed the `.cache/`
  sentence to match prepare.py's remaining outputs.

## Deleted tests and formal artefacts
- None.

## Pins left broken
- None found. Hash pins checked: no committed file pins the sha of any edited file (I grepped each original sha prefix).
  `system-entry` patch sha `58e75d2a…` is unchanged (prepare.py regenerates it, see Verification).
- Note: the Provision Java sources changed. Restaging an AOSP tree that was staged from the previous bytes needs
  `--prior-receipt`, as for any source change. `admitted-previous-sources.json` lists only older hashes and is not edited
  (D17).

## Skipped
- Secure-camera duplicates (`overlay/.../alpha-secure-camera.xml` x2, `secure-camera-inputs.json`): Q-AOSP-2 is Open.
- `power-voice/` packet deletion, `config.xml` assistant defaults, the system-entry lockscreen preset: D7 / Q-P78-1 (keep).
  The power-voice patch fixes (reuse `AlphaSystemEntryPolicy`, the double check) need recompilation and device work.
- `power-voice/SOURCE.json`, the 7 reference rows in `system-entry/SOURCE-INPUTS.json`, the 6 reference rows in
  `provision/source-inputs.json`: Q-AOSP-7 is Open.
- `provision/admitted-previous-sources.json`: kept per D17 (Q-LEG-3).
- AlphaAppearance activity and its 4 strings: Q-AOSP-4 is Open. Only `applyPalette` moved.
- `AlphaFreshSetupPolicy.eligible`/`homeVerified` inlining: `test/aosp-fresh-presets.test.py:30-31,139` calls them and
  asserts the caller text. The suite's future is Q-AOSP-6 (Open). Not done.
- `AlphaFreshSetupPolicy` mid-flow rechecks (lines 33-35, 40): they change the SKIPPED vs FAILED result, which is
  observable behaviour. Skipped.
- `AlphaFreshPresets` single `read()` for `shouldRunWelcome`/`eligible`: the fail-open and fail-closed orderings differ
  (setup-complete/system-user is checked before services in one and not the other). This is risky without an image test,
  and the gain is small. Skipped.
- `AlphaWelcome.fail(int)` with an explicit action: `os-provisioning.mjs:82` and `test/aosp-fresh-presets.test.py`
  anchor on `private void fail(int message) {`. Skipped (T10 port first).
- `alpha-keyboard-dictation.xml` comment rewrite: the report was wrong. IMMS does use `config_systemSpeechRecognizer` to
  pick and enable the system voice IME (`DEFAULT_VOICE_INPUT_METHOD`), so the existing comment is accurate. Left as is.
- `alpha-keyboard.xml` diff against upstream LatinIME styles: upstream LatinIME is not in this repo.
- The identical drawable pairs could be replaced by a values alias. Skipped: it needs a LatinIME build check.
- Optional renames (`strings.xml` -> `alpha*.xml`) and the merge into `alpha-navigation.xml`: file moves belong to stage F.
- Shared `packet.py` (merge `apply.py`/`fetch.py`/`portable_tools.py`, PatchBuilder), and moving prepare.py's embedded
  sources to `system-entry/src/`: new or moved files belong to stage F / U-O1 and U-O2.
- `system-entry` behaviour fixes (prepare.py `available()` double reads, `fits(..., false)`): these regenerate the patch
  and hashes and need a SystemUI build and device acceptance.
- `apply.py` bare `assert` -> `SystemExit`: this changes behaviour under `python -O`. Left as is.
- `system-entry/manifest.json` `identity.source` -> `logoSource`: this would break `test_native_plan.py:172`, which I do
  not own.
- `provision/source-inputs.json` `url` fields: `scripts/fetch-alpha-os-preset-inputs.py:15` asserts them, and I do not
  own that script.

## Verification
- `python3 -B system-entry/fetch.py --inputs-root <scratch copy of the main checkout's system-entry/.cache/baseline>`:
  fetched 0, reused 22. This exercises the derived-URL path offline, but not the network path.
- `python3 -B system-entry/prepare.py --inputs-root <same>`: `{"files": 12, "patchSHA256": "58e75d2a…d8a0"}`. The patch
  hash is unchanged.
- `JAVA_HOME=openjdk@21 ALPHA_SYSTEM_ENTRY_INPUTS=<same> python3 -B system-entry/test_native_plan.py`: 7 tests OK. It
  reads the trimmed manifest.json and compiles the wordmark view against API 36.
- `test/aosp-fresh-presets.test.py`: I ran 2 cases, `test_actual_policy_…` (compiles AlphaFreshSetupPolicy alone) and
  `test_actual_failure_button_…`. Both OK. The other cases need the pinned Provision inputs and assets, which are not
  present. I checked the literal-text assertions of `test_real_api_sources…` by grep, and all still match.
- Quint harnesses `checkOSProvisioning()` and `checkOSSourceStaging()` (node, direct import): both `passed: true`.
  OSProvisioning compiles all four provision Java files with the host fakes and replays 12 traces.
- `node --test test/aosp-cloud-power-defaults.test.mjs`: 3/3 pass.
- XML well-formedness of the 8 drawables: parsed with ElementTree.
- I did not run any AOSP image build, LatinIME/Provision/SystemUI build or device check. Those are the only proof for
  overlay and Provision runtime behaviour. No Gradle (the Provision Java is not part of the app Gradle project).
