# android/aosp/branding/provision/AlphaAppearance.java
- Lines: 60 | Role: Exported Provision activity that applies the Alpha wallpaper (system + lock) and palette on request; also hosts `applyPalette`, the secure-setting palette preset used by first-run. | Verdict: SIMPLIFY (move `applyPalette`); owner question on the activity
- Importers: `AlphaWelcome.java:113` (`AlphaAppearance.applyPalette`). Text/path pins: `specs/quint/application/manifest.json:3968-3971` (OSProvisioning sources: all four provision Java files); `specs/quint/refinement/application/os-provisioning.mjs` compiles them with fakes, reflects on `AlphaWelcome$Completion` fields `waiting` and `generation` (lines ~16-34), and splices text at three literal anchors in AlphaWelcome (lines 80-84: `AlphaFreshSetupPolicy.ImeResult keyboard = AlphaFreshPresets.ensureKeyboard(activity);`, `if (keyboard == AlphaFreshSetupPolicy.ImeResult.FAILED`, `private void fail(int message) {`) and harvests `R.string.*` names from AlphaWelcome + AlphaAppearance (line 85) (T10). `test/aosp-fresh-presets.test.py` (not run by any runner, T9) compiles `AlphaFreshSetupPolicy.java` and asserts text in AlphaFreshPresets/AlphaWelcome (lines 134-149). `scripts/stage-alpha-os-branding.py:127-130` copies the four Java files and `strings.xml` into `packages/apps/Provision`, and `project_activity` (27-33) injects calls to `AlphaFreshPresets.shouldRunWelcome` and `AlphaWelcome.show`; `project_manifest` (42-48) declares the `AlphaAppearance` activity.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-25 | D11 | `static boolean applyPalette(Activity activity)` is the first-run palette preset; it lives in a UI activity and is called from `AlphaWelcome.finishPresets`. Settings writes for first run otherwise live in `AlphaFreshPresets`. | Move `applyPalette` to `AlphaFreshPresets` (take `Context`), call it from both places. | Low. Update `os-provisioning.mjs` only if it names the method (it does not; it harvests strings). |
| 2 | 15-59 | D6 / owner question | README line 30: "The explicit `AlphaAppearance` action is for in-place development updates; fresh wallpaper is supplied by the image's framework default resource". A development-only exported activity ships in every image (`stage-alpha-os-branding.py:47-48` adds `<activity android:name="AlphaAppearance" android:exported="true">`, plus `SET_WALLPAPER` permission and `alpha_wallpaper.png` at :138). | If in-place development updates no longer need it: delete the activity (lines 3-16, 26-59), strings `alpha_wallpaper_preview/apply_wallpaper/wallpaper_applied/wallpaper_failed`, `stage-alpha-os-branding.py` lines 46-48 (activity + SET_WALLPAPER) and 138, the Quint `appearanceNeedsUserActionTest` path, and the `AlphaAppearance.java` entry in `admitted-previous-sources.json`. Keep only `applyPalette` (moved). | Owner decision; staging receipts change. |
| 3 | 34, 44 | C6 | `Color.rgb(5,5,5)` and `Color.BLUE` literals also in `AlphaWelcome.java:27,28,31,60`. | One `static final int BACKGROUND = Color.rgb(5,5,5)` in `AlphaWelcome` (or a `res/values/alpha.xml` colour) used by both. | None. |
| 4 | 44 | D8 | Fully-qualified `android.content.res.ColorStateList` inline. | Import it. | None. |
| 5 | 54 | B1 | `catch (IOException | SecurityException error)` -> toast; specified user-facing fallback. | Keep. | - |

## Local types and helpers
| `applyPalette` | helper | 17-25 | none (only caller AlphaWelcome:113) | `AlphaFreshPresets` |

## Proposed end state
`applyPalette` moved out; activity either deleted (file gone, ~-60 lines) or kept at ~45 lines.

## Verification
Quint OSProvisioning (`npm run` Quint refinement for `specs/quint/application/manifest.json` OSProvisioning entry); `python3 test/aosp-fresh-presets.test.py` with pinned inputs (manual); AOSP Provision build + fresh-image boot for real acceptance.
