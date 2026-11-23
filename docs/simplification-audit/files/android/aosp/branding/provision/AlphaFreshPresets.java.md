# android/aosp/branding/provision/AlphaFreshPresets.java
- Lines: 78 | Role: Privileged Android adapter for first-run: decides whether to show the welcome, whether first-run writes are eligible, and implements `ImePort` over secure settings to preset LatinIME. | Verdict: SIMPLIFY
- Importers: `AlphaWelcome.java:82,106,107`; injected `DefaultActivity` call `AlphaFreshPresets.shouldRunWelcome(this)` (`stage-alpha-os-branding.py:31`). Text/path pins: `specs/quint/application/manifest.json:3968-3971` (OSProvisioning sources: all four provision Java files); `specs/quint/refinement/application/os-provisioning.mjs` compiles them with fakes, reflects on `AlphaWelcome$Completion` fields `waiting` and `generation` (lines ~16-34), and splices text at three literal anchors in AlphaWelcome (lines 80-84: `AlphaFreshSetupPolicy.ImeResult keyboard = AlphaFreshPresets.ensureKeyboard(activity);`, `if (keyboard == AlphaFreshSetupPolicy.ImeResult.FAILED`, `private void fail(int message) {`) and harvests `R.string.*` names from AlphaWelcome + AlphaAppearance (line 85) (T10). `test/aosp-fresh-presets.test.py` (not run by any runner, T9) compiles `AlphaFreshSetupPolicy.java` and asserts text in AlphaFreshPresets/AlphaWelcome (lines 134-149). `scripts/stage-alpha-os-branding.py:127-130` copies the four Java files and `strings.xml` into `packages/apps/Provision`, and `project_activity` (27-33) injects calls to `AlphaFreshPresets.shouldRunWelcome` and `AlphaWelcome.show`; `project_manifest` (42-48) declares the `AlphaAppearance` activity. `test/aosp-fresh-presets.test.py:135` asserts the literal `if (!eligible() || nonempty(selected())) return false;`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-41 | C3 / D9 | `shouldRunWelcome` and `eligible` read the same three facts (`USER_SETUP_COMPLETE`, system user, device owner / managed profile) with opposite failure policy (unknown -> show welcome vs unknown -> not eligible). Two copies of the read, plus `AlphaFreshSetupPolicy.eligible` (a 1-line conjunction). | One private `State read(Context)` returning `{complete, managed, primary}` or null when services/permissions fail; `shouldRunWelcome = s == null || (!s.complete && s.primary && !s.managed)`, `eligible = s != null && !s.complete && !s.managed && s.primary`. Inline `AlphaFreshSetupPolicy.eligible`. | Low-medium: fail-open vs fail-closed must stay exactly as today; Quint OSProvisioning traces cover `authorityLossCannotCompleteTest`. |
| 2 | 62-71 | B3 | Each port write re-runs `eligible()` and `selected()` (`if (!eligible() || nonempty(selected())) return false;`) and `AlphaFreshSetupPolicy.ensureKeyboard` re-runs them again before each call (Policy lines 33-35, 40). Secure settings have no compare-and-set, so only one recheck before the write is meaningful. | Keep the recheck here (closest to the write); delete the duplicate rechecks in `AlphaFreshSetupPolicy` (see that report). Update the text assertion in `test/aosp-fresh-presets.test.py:135` only if this line changes (it does not). | Low. |
| 3 | 26-27, 40, 73 | B1 | Three `catch (IllegalStateException | SecurityException ...)` blocks mapping to fixed results; these are the specified fail-open/fail-closed behaviour and are commented. | Keep, collapse into the single `read` helper from finding 1. | - |
| 4 | 47-48, 64, 70 | D8 | 150-character one-line anonymous-class methods. | Format when touching. | None. |
| 5 | 53-54 | C6 | `"com.android.inputmethod.latin"` / `"...LatinIME"` literals; only here. | Keep. | - |

## Local types and helpers
| `nonempty` | helper | 77 | `AlphaFreshSetupPolicy.ensureKeyboard` inlines the same test 4x (`selected != null && !selected.isEmpty()`) | make package-private and reuse from the policy |
| first-run state read | helper (implicit) | 17-41 | twice in this file | private `read(Context)` here |

## Proposed end state
~62 lines: one state read, two thin predicates, `ensureKeyboard` adapter, plus `applyPalette` moved in from AlphaAppearance.

## Verification
Quint OSProvisioning refinement (`specs/quint/refinement/application/os-provisioning.mjs`); manual `python3 test/aosp-fresh-presets.test.py`; Provision build + fresh image for acceptance.
