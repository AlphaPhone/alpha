# Chunk android-02 — AOSP branding overlays, keyboard overlay, power-voice, provision and system-entry packets

Reports: `docs/simplification-audit/files/<path>.md` for each row. All paths below are under `android/aosp/branding/`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| keyboard-overlay/.../drawable/btn_keyboard_key_lxx_dark.xml | KEEP (`ns0:` -> `android:`) | 13 | 13 |
| keyboard-overlay/.../drawable/btn_keyboard_key_lxx_light.xml | KEEP | 13 | 13 |
| keyboard-overlay/.../drawable/btn_keyboard_key_popup_action_lxx_dark.xml | KEEP (identical to spacebar_dark) | 5 | 5 |
| keyboard-overlay/.../drawable/btn_keyboard_key_popup_action_lxx_light.xml | KEEP (identical to spacebar_light) | 5 | 5 |
| keyboard-overlay/.../drawable/btn_keyboard_key_popup_lxx_dark.xml | KEEP | 5 | 5 |
| keyboard-overlay/.../drawable/btn_keyboard_key_popup_lxx_light.xml | KEEP | 5 | 5 |
| keyboard-overlay/.../drawable/btn_keyboard_spacebar_lxx_dark.xml | KEEP | 5 | 5 |
| keyboard-overlay/.../drawable/btn_keyboard_spacebar_lxx_light.xml | KEEP | 5 | 5 |
| keyboard-overlay/.../values/alpha-keyboard.xml | KEEP (diff styles vs upstream) | 115 | 60–115 |
| manifests/AlphaFrameworkOverlay.xml | KEEP | 5 | 5 |
| manifests/AlphaNavigationOverlay.xml | KEEP | 5 | 5 |
| manifests/AlphaSettingsOverlay.xml | KEEP | 5 | 5 |
| manifests/AlphaSettingsProviderOverlay.xml | KEEP | 5 | 5 |
| manifests/AlphaSystemUIOverlay.xml | KEEP | 5 | 5 |
| overlay/frameworks/base/core/res/res/values/alpha-keyboard-dictation.xml | KEEP (fix comment) | 6 | 4 |
| overlay/frameworks/base/core/res/res/values/alpha-secure-camera.xml | DELETE (owner confirm) | 2 | 0 |
| overlay/frameworks/base/core/res/res/values/colors.xml | KEEP | 41 | 41 |
| overlay/frameworks/base/core/res/res/values/config.xml | KEEP (P-78 question) | 27 | 22–27 |
| overlay/frameworks/base/packages/SettingsProvider/res/values/defaults.xml | KEEP | 5 | 5 |
| overlay/frameworks/base/packages/SystemUI/res/values/alpha-navigation.xml | KEEP | 7 | 7 |
| overlay/frameworks/base/packages/SystemUI/res/values/alpha-secure-camera.xml | DELETE (owner confirm) | 2 | 0 |
| overlay/frameworks/base/packages/SystemUI/res/values/strings.xml | KEEP | 5 | 5 |
| overlay/packages/apps/Launcher3/res/values/alpha-navigation.xml | KEEP | 5 | 5 |
| overlay/packages/apps/Settings/res/values/alpha-navigation.xml | KEEP | 10 | 10 |
| overlay/packages/apps/Settings/res/values/strings.xml | KEEP (optional merge) | 4 | 4 |
| power-voice/README.md | DELETE with packet (P-78) / SIMPLIFY | 30 | 0 / 12 |
| power-voice/SOURCE.json | DELETE | 55 | 0 |
| power-voice/alpha-protected-power-voice.patch | DELETE with packet (P-78) / KEEP | 175 | 0 / 175 |
| power-voice/manifest.json | DELETE with packet / SIMPLIFY | 29 | 0 / 18 |
| provision/.gitignore | DELETE (merge up) | 3 | 0 |
| provision/AlphaAppearance.java | SIMPLIFY (move `applyPalette`; activity owner question) | 60 | 0–45 |
| provision/AlphaFreshPresets.java | SIMPLIFY | 78 | 62 |
| provision/AlphaFreshSetupPolicy.java | SIMPLIFY | 47 | 33 |
| provision/AlphaWelcome.java | SIMPLIFY | 154 | 140 |
| provision/README.md | SIMPLIFY | 78 | 40 |
| provision/admitted-previous-sources.json | DELETE (owner confirm) | 11 | 0 |
| provision/source-inputs.json | SIMPLIFY | 100 | 35 |
| provision/strings.xml | KEEP | 22 | 18–22 |
| secure-camera-inputs.json | DELETE | 12 | 0 |
| system-entry/.gitattributes | MERGE up | 2 | 0 |
| system-entry/.gitignore | DELETE (merge up) | 3 | 0 |
| system-entry/PROVENANCE.json | DELETE | 69 | 0 |
| system-entry/README.md | SIMPLIFY | 116 | 55 |
| system-entry/SOURCE-INPUTS.json | SIMPLIFY | 116 | 45 |
| system-entry/alpha-native-system-entry.patch | KEEP (generated) | 374 | 370 |
| system-entry/apply.py | MERGE into shared `android/aosp/branding/packet.py` | 47 | 0 (+45 shared) |
| system-entry/fetch.py | MERGE into shared `packet.py` | 42 | 0 (+35 shared) |
| system-entry/manifest.json | SIMPLIFY | 108 | 55 |
| system-entry/portable_tools.py | MOVE to shared `packet.py` | 30 | 0 (+30 shared) |
| system-entry/prepare.py | SIMPLIFY (bodies -> real `src/` files) | 394 | 110 (+~270 in `src/`) |

Total now 2,465 lines. Removable without an owner decision: ~640 lines (PROVENANCE, SOURCE.json, secure-camera-inputs, ignore/attribute files, unread manifest/lock fields, README history, prepare.py dead writes and dead asserts, fetch/apply merged into shared code). With owner decisions (P-78 power-voice, AlphaAppearance, admitted-previous-sources, secure-camera duplicates): about 300 more.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `digest`/`sha` (SHA-256 hex) | helper | system-entry/apply.py:19, prepare.py:18 | `hidden-navigation-handle/apply.py:13`, `core-launcher/prepare.py`, `scripts/stage-alpha-os-branding.py:9`, `system-entry/test_native_plan.py:15`, `fetch.py` inline, `scripts/fetch-alpha-os-preset-inputs.py:26` | `android/aosp/branding/packet.py` |
| symlink-safe relative path walk | helper | system-entry/apply.py:28-33, fetch.py:18-25 | `stage-alpha-os-branding.py:18-25 safe()`, `hidden-navigation-handle/apply.py:20-21,29-31`, `fetch-alpha-os-preset-inputs.py:17-19` | `packet.py safe()` |
| pinned googlesource fetcher | helper | system-entry/fetch.py:1-42 | `scripts/fetch-alpha-os-preset-inputs.py:11-28`, `core-launcher/prepare.py:20-33`, `hidden-navigation-handle/prepare.py` | `packet.py fetch()` |
| patch admission/apply | helper | system-entry/apply.py:1-47 | `hidden-navigation-handle/apply.py:1-45`, `stage-alpha-os-branding.py:58-64` (header scope) | `packet.py admit()` |
| `original`/`replace_once`/`edit`/`add` + diff emitter | helper | system-entry/prepare.py:19-30, 359-369 | `core-launcher/prepare.py:35-46`, `hidden-navigation-handle/prepare.py` | `packet.py PatchBuilder` |
| repo-root discovery via `app.config.json` | helper | system-entry/prepare.py:11 | `system-entry/test_native_plan.py:7`, `stage-alpha-os-branding.py:6` (parents[1]) | `packet.py REPO` |
| `java_binary`, `android_api_jar` | helper | system-entry/portable_tools.py:5-30 | `scripts/ci/calendar-bridge.py` (java_home), `test/fixtures/jvm-tools.mjs` (JS) | `packet.py` |
| source-lock schema | type (JSON) | system-entry/SOURCE-INPUTS.json, provision/source-inputs.json, power-voice/SOURCE.json | `core-launcher/SOURCE-INPUTS.json`, `keyboard-dictation/source-inputs.json`, `home-back-keyboard-inputs.json` (different keys: `beforeSha256` vs `sha256`, per-row `project`) | one schema `{project, revision, files:[{path, sha256}]}` read by `packet.py` |
| patch manifest schema | type (JSON) | system-entry/manifest.json, power-voice/manifest.json | `core-launcher/manifest.json`, `hidden-navigation-handle/manifest.json` | one schema read by `packet.admit()` |
| `AlphaSystemEntryPolicy.PACKAGE/ACTIVITY` | const (generated Java) | system-entry/prepare.py:46-47 | `power-voice/*.patch:93-97 ALPHA_PACKAGE/ALPHA_ASSIST`, `provision/AlphaWelcome.java:68 HOME`, `overlay/.../config.xml:5`, `alpha-keyboard-dictation.xml:5`, `scripts/apk.ts:89,145` | stays per module (separate AOSP builds); power-voice patch should reuse `AlphaSystemEntryPolicy` if kept |
| `applyPalette` | helper | provision/AlphaAppearance.java:17-25 | none | `AlphaFreshPresets` |
| first-run state read | helper (implicit) | provision/AlphaFreshPresets.java:17-41 (twice) | — | private `read()` in AlphaFreshPresets |
| `nonempty` | helper | provision/AlphaFreshPresets.java:77 | inlined 3x in `AlphaFreshSetupPolicy.java:25,35,43` | shared package-private helper |
| `eligible`, `homeVerified` | helper | provision/AlphaFreshSetupPolicy.java:6-11 | trivial conjunctions | inline |
| near-black / blue colour literals | const | provision/AlphaWelcome.java:27-31,60; AlphaAppearance.java:34,44 | `colors.xml`, `alpha-keyboard.xml`, `config.xml:10`, `system-entry/manifest.json:87-88` | one Java constant in provision; palette documented once in branding README |
| `ImePort`, `ImeResult`, `Completion` | interface/enum/class | AlphaFreshSetupPolicy.java:12-20; AlphaWelcome.java:67-129 | faked in `os-provisioning.mjs` and `test/aosp-fresh-presets.test.py` | stay |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `system-entry/PROVENANCE.json` | grep `PROVENANCE.json`: 0 readers; duplicates manifest.json + history | high |
| `power-voice/SOURCE.json` | 0 readers; 2 of 9 rows duplicated in manifest.json, 7 are review references | high |
| `secure-camera-inputs.json` (+ entry at `stage-alpha-os-branding.py:103`) | only copied as bytes by staging; never parsed by anything | high |
| `provision/.gitignore`, `system-entry/.gitignore` (+ core-launcher, hidden-navigation-handle twins) | identical; `.cache/` can live in `android/aosp/branding/.gitignore`, `__pycache__/` in root `.gitignore:45`; nothing writes `*.log` | high |
| `system-entry/prepare.py:352-355` assert, `:372` patch copy, `:373-393` overlay + manifest record writes | assert always true; outputs unread (`test_native_plan.py` reads only `staged/` and the overlay, overlay comparison redundant with committed file + sha) | high |
| unread fields in `system-entry/manifest.json` (`new`, `identity.*` except source, `productOverlay.resources/destination`, status flags) and `provision/source-inputs.json` (`settingsUpdateAuthority`, `homeRoleAuthority`, `productIcon.reuse/geometry/assetPreservation`) | grep of all readers (apply.py, prepare.py, test_native_plan.py, stage script, fetch script) | high |
| `system-entry/README.md:89-116` OS17 QA narrative; `power-voice/README.md:15-23`; `provision/README.md:60-65` | history/tombstones (A8) | high |
| 7 unread rows in `system-entry/SOURCE-INPUTS.json`; 6 reference rows in `provision/source-inputs.json` | not read by prepare/test/stage (filename check) | medium (owner may want review refs) |
| `power-voice/` whole packet (289 lines) | no script/test/stage reads it; requires `AlphaPowerVoiceActivity` exported while app ships it disabled+unexported (P-78) | medium — owner decision P-78 |
| `provision/admitted-previous-sources.json` + `stage-alpha-os-branding.py` `previous_activity` (35-40, 124, 126-130 args) | A1 admission of pre-rename staged files; `--prior-receipt` covers receipted trees | medium — owner confirm no old staged tree |
| `AlphaAppearance` activity + 4 strings + staging lines 46-48,138 | README: "for in-place development updates" (dev surface in product image) | medium — owner decision |
| `overlay/.../alpha-secure-camera.xml` (framework + SystemUI) | byte copies of `vendor/alphaphone/secure-camera` static overlay already kept in base packages by `branding.mk:3-4` | medium — owner confirm packet always present |
| `AlphaFreshSetupPolicy.eligible`/`homeVerified` | single-caller conjunctions for host test | high (code), test edit needed |

## Cross-file actions
1. **Shared AOSP packet tool.** Create `android/aosp/branding/packet.py` (digest, safe path walk, `fetch(lock)`, `admit(manifest, apply)`, `PatchBuilder`, `java_binary`, `android_api_jar`, `REPO`). Files: `system-entry/{apply,fetch,portable_tools,prepare,test_native_plan}.py`, `hidden-navigation-handle/{apply,prepare,test_hidden_handle}.py`, `core-launcher/{prepare,test_policy}.py`, `core-launcher/README.md:13`, `scripts/fetch-alpha-os-preset-inputs.py`, `scripts/stage-alpha-os-branding.py:9,18-25,58-64`, `test/aosp-fresh-presets.test.py:7-8`, READMEs. Quint `OSSourceStaging` hashes `stage-alpha-os-branding.py` and `fetch-alpha-os-preset-inputs.py` (`specs/quint/application/manifest.json:3990-3992`, `scripts/quint-lib.ts:10`) — add `packet.py` to those source lists if the scripts import it.
2. **System-entry behaviour fixes** (prepare.py 101-117 double reads, `fits(..., false)` parameter). Regenerate together: `system-entry/prepare.py` -> `alpha-native-system-entry.patch`, `system-entry/manifest.json` (`patchSha256`, affected `afterSha256`), `power-voice/manifest.json:7` (or replace with a reference to system-entry/manifest.json), `PROVENANCE.json` (delete instead). Requires full SystemUI build and device acceptance.
3. **Move generated sources out of Python strings**: `system-entry/prepare.py` + new `system-entry/src/**` (6 files) + `test_native_plan.py` (compile from `src/`). Pure refactor: hash 58e75d2a… must not change.
4. **Secure-camera duplicate removal**: delete `overlay/frameworks/base/core/res/res/values/alpha-secure-camera.xml`, `overlay/frameworks/base/packages/SystemUI/res/values/alpha-secure-camera.xml`, `secure-camera-inputs.json`; edit `branding.mk:3` comment and `scripts/stage-alpha-os-branding.py:103`; fix `test/aosp-cloud-power-defaults.test.mjs:18-22` (claims camera stays stock while the RRO sets the camera gesture).
5. **P-78 consistency** (owner): `overlay/.../config.xml:5-7` (assistant + long-press Power), `system-entry` lockscreen default `bottom_start:alpha_assistant` (`product-overlay/values/alpha-system-entry.xml`, `manifest.json`, `prepare.py:378-380`), `power-voice/*`, `android/app/src/main/AndroidManifest.xml:124,129` (disabled `AlphaAssistActivity`/`AlphaPowerVoiceActivity`), `test/aosp-cloud-power-defaults.test.mjs`, `scripts/apk.ts:89,145`, `test/apk-alpha-power-policy.test.mjs`, `test/power-sense-entry.test.mjs`, Quint native `assistant-entry*` and `navigation-service*` harnesses.
6. **Provision cleanup**: `AlphaAppearance.java` (move `applyPalette` to `AlphaFreshPresets.java`), `AlphaFreshSetupPolicy.java` (inline conjunctions, drop rechecks), `AlphaWelcome.java` (`fail` signature), `specs/quint/refinement/application/os-provisioning.mjs:80-85` (text anchors, `$Completion` reflection), `test/aosp-fresh-presets.test.py:30-31,135-149`, `scripts/stage-alpha-os-branding.py:27-48,124-138` (if AlphaAppearance/admitted-previous-sources go), `provision/strings.xml`, `provision/admitted-previous-sources.json`.
7. **Ignore/attribute consolidation**: add `.cache/` to `android/aosp/branding/.gitignore`, create `android/aosp/branding/.gitattributes` (`*.patch -whitespace`); delete `provision/.gitignore`, `system-entry/.gitignore`, `core-launcher/.gitignore`, `hidden-navigation-handle/.gitignore`, `system-entry/.gitattributes`, `hidden-navigation-handle/.gitattributes`.
8. **Manual Python tests (T9)**: `test/aosp-fresh-presets.test.py`, `system-entry/test_native_plan.py`, `hidden-navigation-handle/test_hidden_handle.py`, `core-launcher/test_policy.py` — wire into `test/python-suites.test.mjs` with input-dir skips, or delete (Quint covers the provision Java). Same decision as research android.md §3.

## Text/path pins
- `scripts/stage-alpha-os-branding.py`: walks `overlay/`, `keyboard-overlay/`, `manifests/` (105-108), copies `Android.bp`, `branding.mk`, `secure-camera-inputs.json` (103), reads `system-entry/manifest.json` `productOverlay` (110-113), `provision/source-inputs.json` (8), `provision/admitted-previous-sources.json` (126), the four provision Java files + `strings.xml` (127-130); injects text naming `AlphaFreshPresets.shouldRunWelcome` and `AlphaWelcome.show` (27-40) and the `AlphaAppearance` activity (42-48).
- `scripts/fetch-alpha-os-preset-inputs.py:10` — `provision/source-inputs.json`.
- `android/aosp/branding/Android.bp` — the five `manifests/*.xml` paths and `overlay/*` resource dirs; `branding.mk` — `keyboard-overlay`, overlay module names.
- `test/aosp-cloud-power-defaults.test.mjs:6-34` — regex-parses `overlay/frameworks/base/core/res/res/values/config.xml` and the `Android.bp` `AlphaFrameworkOverlay` block (T1).
- `test/aosp-fresh-presets.test.py` (unrun) — imports `system-entry/portable_tools`, reads `alpha-keyboard-dictation.xml` (`config_systemSpeechRecognizer`), `system-entry/product-overlay/values/alpha-system-entry.xml`, compiles `AlphaFreshSetupPolicy.java`, asserts literal text in `AlphaFreshPresets.java:63/67` and `AlphaWelcome.java:96`.
- `specs/quint/application/manifest.json:3968-3971` — the four provision Java paths (OSProvisioning sources); `:3990-3992` stage/fetch scripts.
- `specs/quint/refinement/application/os-provisioning.mjs:10,79-85` — provision folder path, three literal line anchors in `AlphaWelcome.java`, reflection on `Completion.waiting/generation`, `R.string.*` harvest from AlphaWelcome + AlphaAppearance (T10).
- `specs/quint/refinement/application/os-source-staging.mjs:102-103` — `provision/source-inputs.json` as hashed input.
- `system-entry/test_native_plan.py`, `hidden-navigation-handle/test_hidden_handle.py:5-6` — `portable_tools` import path; `core-launcher/README.md:13` — `../system-entry/apply.py`.
- Hash pins: `system-entry/manifest.json:6` = patch sha 58e75d2a…, repeated in `power-voice/manifest.json:7` and `PROVENANCE.json:10,59`; `power-voice/manifest.json:6` = power patch sha; `system-entry/manifest.json:92` = product-overlay sha; `provision/source-inputs.json:79,81` = `app_icon.xml` and `logo-mark.svg` hashes (so editing `apps/app/public/logo-mark.svg` or `android/app/src/main/res/drawable/app_icon.xml` breaks staging and `system-entry/prepare.py`).
- No hits in `test/support/feature-parity.mjs` or `LemmaScript-files.txt`.

## New patterns
- **NEW-A (unread JSON ceremony fields in reviewed records)**: provenance/status/narrative keys (`compiled`, `deviceQualified`, `identity.*`, `*Authority`, `geometry`) kept in machine records that no tool reads. These are B5 provenance in JSON form; fold into B5.
- **NEW-B (source embedded as string literals in a generator)**: Java/Kotlin/XML living inside Python strings (`system-entry/prepare.py`, likely `core-launcher/prepare.py` and `hidden-navigation-handle/prepare.py` too), so the real code cannot be linted or compiled directly and is duplicated in the committed patch. Treatment: keep new files as real source files and let the generator read them. Could be a C7 sub-case.
- **NEW-C (image config contradicts app manifest)**: OS defaults (default assistant, long-press Power, lockscreen preset, power-voice patch) point at app components that the app ships disabled (P-78), and nothing checks the two agree. Suggest a check in `scripts/apk.ts`/`stage-aosp.ts` or an owner decision that removes one side.
- **NEW-D (test asserts "stock" while a sibling file changes it)**: `test/aosp-cloud-power-defaults.test.mjs` checks one file of an RRO directory, while another file in the same directory sets the value the test claims stays stock. A T1 variant that gives false assurance.

## Owner questions
1. P-78: does Power long-press and the lockscreen "Open Alpha" entry ship? Today the image sets `config_defaultAssistant`, long-press Power = assistant, a bottom-start lockscreen preset and a power-voice patch, while `AlphaAssistActivity`/`AlphaPowerVoiceActivity` ship disabled and not exported. Pick one: enable the components, or remove the image defaults and the `power-voice/` packet.
2. Is `vendor/alphaphone/secure-camera` always part of the product? If yes, the two `alpha-secure-camera.xml` copies and `secure-camera-inputs.json` can go.
3. Is any AOSP tree staged from pre-2026-11-10 Provision sources still updated in place without a prior receipt? If not, delete `admitted-previous-sources.json` and `previous_activity`.
4. Is the exported `AlphaAppearance` activity (described as being for in-place development updates) still wanted in images?
5. Should the AOSP Python tests (`test/aosp-fresh-presets.test.py`, `system-entry/test_native_plan.py`, …) be wired into `test/python-suites.test.mjs` with input-dir skips, or deleted in favour of the Quint harnesses?
6. Should source-lock rows that are only review references (7 in system-entry, 6 in provision, 7 in power-voice) stay?
