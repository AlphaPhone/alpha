# android/aosp/branding/home-back-keyboard.patch
- Lines: 204 | Role: Launcher3 + LatinIME patch: adds default-off `config_alpha_home_back_only` (disables overview, quick-switch, pause-to-overview, overview tutorial) and `config_default_keyboard_theme` (default keyboard theme when no saved preference) | Verdict: KEEP (product source) — not wired into staging
- Importers: no script applies it (git grep `home-back-keyboard.patch`: `branding/README.md:50`, `hidden-navigation-handle/README.md:32`, `hidden-navigation-handle/manifest.json:19`, `hidden-navigation-handle/test_hidden_handle.py:115-116`). Text/path pins: `test_hidden_handle.py:116` asserts the literal `<bool name="config_alpha_home_back_only">false</bool>` (T1).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | NEW (unwired packet) | `scripts/stage-alpha-os-branding.py:105` stages `overlay/packages/apps/Launcher3/res/values/alpha-navigation.xml` (`config_alpha_home_back_only=true`) and `keyboard-overlay/.../alpha-keyboard.xml` (`config_default_keyboard_theme=4`), but this patch, which defines and reads those resources, is applied by nothing in the repo. A staged image therefore either fails to compile the overlays or ships them inert. | Owner decision; preferred: stage it like the core-launcher packet (`core_policy_plan`): manifest with before/after hashes (from `home-back-keyboard-inputs.json`), header-scope check, scratch apply. See X1. | Medium (image behaviour) |
| 2 | 1-9, 181-189 | — | Two projects (Launcher3, LatinIME) in one patch with `packages/...` prefixed paths, unlike the per-project packets (paths relative to the project root). | When wiring, split into per-project patches or apply at AOSP root; keep content identical. | Low |
| 3 | 34-36 | D11 | `isHomeBackOnly()` is inserted between `isOverviewDisabled()`'s Javadoc ("@return whether overview is disabled") and the method, so the Javadoc now documents the wrong method. | Move the new method above the Javadoc when regenerating. | Low |
| 4 | 158-165 | — | `getTutorialSteps` override sets `mNumSteps`/`mCurrentStep` and clamps extras; logic fine. | None. | — |

## Local types and helpers
None.

## Proposed end state
Content unchanged except the Javadoc placement (finding 3), ~204 lines; wired into staging via a manifest (X1).

## Verification
AOSP Launcher3 + LatinIME build with the overlays; emulator/device gesture checks (Home, edge Back, no overview/quick-switch, tutorial). No host test covers this patch.
