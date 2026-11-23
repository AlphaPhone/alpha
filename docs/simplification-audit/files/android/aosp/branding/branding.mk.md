# android/aosp/branding/branding.mk
- Lines: 9 | Role: product makefile fragment adding the five RRO packages, the LatinIME static overlay and the boot animation | Verdict: KEEP
- Importers: staged as `vendor/alphaphone/branding/branding.mk` by `scripts/stage-alpha-os-branding.py:103`, inherited via `$(call inherit-product, vendor/alphaphone/branding/branding.mk)` (`:140`). Text/path pins: `test/aosp-cloud-power-defaults.test.mjs:15` regex `PRODUCT_PACKAGES \+= AlphaFrameworkOverlay` (T1; also requires AlphaFrameworkOverlay to stay first on the line); `test/aosp-fresh-presets.test.py:78` byte compare.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | NEW (cross-packet coupling) | `PRODUCT_ENFORCE_RRO_EXCLUDED_OVERLAYS += vendor/alphaphone/secure-camera/overlay` belongs to the secure-camera packet (`secure-camera-inputs.json`, `scripts/verify-aosp-secure-camera.ts`), not branding. | Leave; moving it changes a reviewed product makefile. Note only. | — |
| 2 | 7-8 | — | `keyboard-overlay` sets `config_default_keyboard_theme`, a resource introduced only by the unstaged `home-back-keyboard.patch` (see README finding 2). | Covered by cross-file action X1. | Medium |

## Local types and helpers
None.

## Proposed end state
Unchanged, 9 lines.

## Verification
`node --test test/aosp-cloud-power-defaults.test.mjs`; AOSP product build.
