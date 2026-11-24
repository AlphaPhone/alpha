# android/aosp/branding/provision/AlphaWelcome.java
- Lines: 154 | Role: First-run welcome screen built imperatively (Wi-Fi, screen security, Continue); `Completion` requests the Home role with a 15 s timeout and attempt-generation fence, then applies keyboard and palette presets before calling the provisioner's `finishSetup`. | Verdict: SIMPLIFY (small)
- Importers: injected `DefaultActivity` (`AlphaWelcome.show(this, this::finishSetup)`, `stage-alpha-os-branding.py:33,40`). Text/path pins: `specs/quint/application/manifest.json:3968-3971` (OSProvisioning sources: all four provision Java files); `specs/quint/refinement/application/os-provisioning.mjs` compiles them with fakes, reflects on `AlphaWelcome$Completion` fields `waiting` and `generation` (lines ~16-34), and splices text at three literal anchors in AlphaWelcome (lines 80-84: `AlphaFreshSetupPolicy.ImeResult keyboard = AlphaFreshPresets.ensureKeyboard(activity);`, `if (keyboard == AlphaFreshSetupPolicy.ImeResult.FAILED`, `private void fail(int message) {`) and harvests `R.string.*` names from AlphaWelcome + AlphaAppearance (line 85) (T10). `test/aosp-fresh-presets.test.py` (not run by any runner, T9) compiles `AlphaFreshSetupPolicy.java` and asserts text in AlphaFreshPresets/AlphaWelcome (lines 134-149). `scripts/stage-alpha-os-branding.py:127-130` copies the four Java files and `strings.xml` into `packages/apps/Provision`, and `project_activity` (27-33) injects calls to `AlphaFreshPresets.shouldRunWelcome` and `AlphaWelcome.show`; `project_manifest` (42-48) declares the `AlphaAppearance` activity.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 119-128 | D10 | `fail(int message)` derives the recovery Settings action and button label by comparing the message resource id (`message == R.string.alpha_home_failed ? ...ACTION_HOME_SETTINGS : message == R.string.alpha_keyboard_failed ? ...`). | Pass the action explicitly: `fail(R.string.alpha_home_failed, Settings.ACTION_HOME_SETTINGS)` etc. (6 call sites), or an enum `Failure {HOME, KEYBOARD, OTHER}` carrying message/action/label. | Low. `os-provisioning.mjs:82` anchors on the literal `private void fail(int message) {` -- update that anchor in the same change (T10). |
| 2 | 27-31, 60, 142 | C6 | `Color.rgb(5, 5, 5)` x3, `Color.BLUE`, `Color.rgb(36,36,42)`; same near-black in `AlphaAppearance:34`. | One `BACKGROUND` constant shared with AlphaAppearance. | None. |
| 3 | 60, 142 | D8 | `android.content.res.ColorStateList` fully qualified twice. | Import. | None. |
| 4 | 26 | D4 | `final int foreground = Color.WHITE;` alias used 2x while `button` hard-codes `Color.WHITE`. | Use `Color.WHITE` directly. | None. |
| 5 | 84-100 | B1 | Three `catch (IllegalStateException | SecurityException failure)` mapped to `fail(alpha_home_failed)`; specified recovery UI. | Keep; one outer try in `begin` is enough if the callback body keeps its own. | - |
| 6 | 73-74, 81, 89, 93 | C4 | `waiting` + `generation` staleness fence (one of ~30 in the codebase). Here it is self-contained and the Quint model depends on these exact fields via reflection. | Keep; do not rename without updating `os-provisioning.mjs`. | - |
| 7 | 68 | C6 | `HOME = "ai.alphacompute.alphaphone"`; Provision cannot read app config. | Keep. | - |
| 8 | 76-77, 87, 120, 127 | D8 | Several statements per line. | Format when touching. | None. |

## Local types and helpers
| `Completion` | class | 67-129 | none; fields `waiting`/`generation` reflected by Quint | here |
| `dp`, `text`, `button`, `open` | helper | 21-23, 131-153 | `AlphaAppearance` repeats density maths inline (29-33, 45) | keep here; let AlphaAppearance use `dp` if it survives |

## Proposed end state
~140 lines: same UI and copy, explicit failure kinds, shared colour constants.

## Verification
Quint OSProvisioning refinement (update anchor at `os-provisioning.mjs:82` if `fail` signature changes); manual `test/aosp-fresh-presets.test.py`; Provision build, fresh-image first-run on device (TalkBack heading/live region preserved: lines 44, 52).
