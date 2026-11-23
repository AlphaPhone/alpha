# android/aosp/branding/README.md
- Lines: 68 | Role: overview of the Alpha OS branding packet (overlays, boot animation, Home/Back and keyboard policy) | Verdict: SIMPLIFY
- Importers: none (doc). Text/path pins: none found (git grep for its headings: 0).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 66-67 | A8 | "Local preparation, host policy tests and guarded GCP staging live under the task's `builder/` directory" — no `builder/` directory exists in the repo (`ls builder`: not found; git grep `builder/` in android/aosp: none). | Delete the sentence; name the real tools: `scripts/stage-alpha-os-branding.py`, `scripts/generate-alpha-os-branding.ts`. | — |
| 2 | 47-56, 65 | NEW (unwired packet) | Describes `home-back-keyboard.patch` + `home-back-keyboard-inputs.json` as part of the product, but no script applies or verifies them (git grep `home-back-keyboard`: only this README, `hidden-navigation-handle/{README,manifest.json,test_hidden_handle.py}`). Meanwhile `scripts/stage-alpha-os-branding.py:105` stages `overlay/packages/apps/Launcher3/.../alpha-navigation.xml` (`config_alpha_home_back_only=true`) and `keyboard-overlay/.../alpha-keyboard.xml` (`config_default_keyboard_theme=4`), both of which target resources that exist only after that patch. | Document the actual state (patch applied by hand) or, preferably, wire the patch into `core_policy_plan`-style staging (see chunk cross-file action X1). Owner question. | Medium (image behaviour) |
| 3 | 22-45 | B5 | Repeated "source/assets are preparation, not evidence" disclaimers (also in POWER-INVOCATION.md, core-launcher/README.md, hidden-navigation-handle/README.md, keyboard-dictation/README.md). | Keep one "Evidence classes" paragraph here (AGENTS.md already states the rule) and delete the copies in sub-READMEs. | — |
| 4 | — | C7 | Five READMEs for one packet (`branding/`, `core-launcher/`, `hidden-navigation-handle/`, `keyboard-dictation/`, `POWER-INVOCATION.md`, plus `system-entry/`, `provision/`). | Merge POWER-INVOCATION.md and keyboard-dictation/README.md into this file as sections; keep sub-READMEs only where they carry run commands. | — |

## Local types and helpers
None.

## Proposed end state
~50 lines: overlay table, build/stage commands with real script names, Home/Back + keyboard policy (stating whether the patch is staged), one evidence-class paragraph, plus absorbed "Power/assistant defaults" and "Keyboard dictation" sections (~15 lines each from the deleted files).

## Verification
None (documentation); `test/docs-links.test.mjs` if it scans android/ (check before renaming headings).
