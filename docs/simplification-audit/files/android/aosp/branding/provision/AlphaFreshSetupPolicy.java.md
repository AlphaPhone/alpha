# android/aosp/branding/provision/AlphaFreshSetupPolicy.java
- Lines: 47 | Role: Pure first-run decisions: eligibility conjunction, Home verification conjunction, and the keyboard preset algorithm over an `ImePort`. | Verdict: SIMPLIFY
- Importers: `AlphaFreshPresets.java:36,45`, `AlphaWelcome.java:96,107-108`. Text/path pins: `specs/quint/application/manifest.json:3968-3971` (OSProvisioning sources: all four provision Java files); `specs/quint/refinement/application/os-provisioning.mjs` compiles them with fakes, reflects on `AlphaWelcome$Completion` fields `waiting` and `generation` (lines ~16-34), and splices text at three literal anchors in AlphaWelcome (lines 80-84: `AlphaFreshSetupPolicy.ImeResult keyboard = AlphaFreshPresets.ensureKeyboard(activity);`, `if (keyboard == AlphaFreshSetupPolicy.ImeResult.FAILED`, `private void fail(int message) {`) and harvests `R.string.*` names from AlphaWelcome + AlphaAppearance (line 85) (T10). `test/aosp-fresh-presets.test.py` (not run by any runner, T9) compiles `AlphaFreshSetupPolicy.java` and asserts text in AlphaFreshPresets/AlphaWelcome (lines 134-149). `scripts/stage-alpha-os-branding.py:127-130` copies the four Java files and `strings.xml` into `packages/apps/Provision`, and `project_activity` (27-33) injects calls to `AlphaFreshPresets.shouldRunWelcome` and `AlphaWelcome.show`; `project_manifest` (42-48) declares the `AlphaAppearance` activity. `test/aosp-fresh-presets.test.py:24-41` compiles this file alone with a fake `Port` and calls `eligible`, `homeVerified`, `ensureKeyboard`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | D7 / D4 | `static boolean eligible(boolean setupComplete, boolean managed, boolean primaryUser) { return !setupComplete && !managed && primaryUser; }` exists so a host test can call a conjunction. | Inline into `AlphaFreshPresets` (see that report) and drop the test line 30. | Low. |
| 2 | 9-11 | D7 / D4 | `homeVerified(accepted, alphaHoldsRole)` = `accepted && alphaHoldsRole`; single caller `AlphaWelcome:96`. `test/aosp-fresh-presets.test.py:139` asserts the caller text `homeVerified(Boolean.TRUE.equals(accepted), held(roles))`. | Inline at the call site: `if (Boolean.TRUE.equals(accepted) && held(roles))`. Update the manual test assertion. | Low. |
| 3 | 33-35, 40 | B3 | After computing `contains`, the algorithm re-asks `port.eligible()` and `port.selected()` (33-35) and `port.eligible()` again (40), while `enableIfUnchanged` and `selectIfEmpty` already refuse when ineligible or a selection exists (`AlphaFreshPresets.java:63,67`). | Delete 33-35 and 40. When `enableIfUnchanged` returns false, reuse the existing fallback at 41-43 (`selected nonempty ? EXISTING_CHOICE : FAILED`), so a race still yields EXISTING_CHOICE. Result: SKIPPED only from the first check. | Medium: the SKIPPED-vs-FAILED distinction on a mid-flow eligibility loss changes, but `AlphaWelcome.finishPresets:108` treats both the same (`alpha_keyboard_failed`). Re-run Quint OSProvisioning (`authorityLossCannotCompleteTest`, `existingKeyboardPreservedTest`). |
| 4 | 25, 35, 43 | C3 | `selected != null && !selected.isEmpty()` three times; `AlphaFreshPresets.nonempty` exists. | Use one `nonempty` helper. | None. |
| 5 | 30-32 | D8 | `if (enabled != null) for (...) { if (...) contains = true; }` on one line. | `boolean contains = enabled != null && Arrays.stream(enabled.split(":")).anyMatch(i -> target.equals(i.split(";", 2)[0]));` | None. |

## Local types and helpers
| `ImeResult` | enum | 12 | none | here |
| `ImePort` | interface | 13-20 | none (implemented once in AlphaFreshPresets:45-72, faked in `os-provisioning.mjs` and `aosp-fresh-presets.test.py`) | here (real seam for the Quint harness) |
| `eligible`, `homeVerified` | helper | 6-11 | conjunctions | inline |

## Proposed end state
~33 lines: `ImeResult`, `ImePort`, one straight-line `ensureKeyboard`.

## Verification
Quint OSProvisioning; `python3 test/aosp-fresh-presets.test.py` (manual, update lines 30-31, 139).
