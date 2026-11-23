# android/app/src/main/res/values/aosp-capabilities.xml
- Lines: 10 | Role: `alpha_aosp_image_capability` bool (false in every APK) plus the `AlphaImageProvisioning` overlayable that lets only the AOSP product overlay flip it. | Verdict: KEEP
- Importers: `AlphaImageCapabilities.java` (reads the bool); AOSP overlay generation `scripts/aosp-capability-overlay.ts`, `android/aosp/pixel10a-composition.json`. Text/path pins: `test/aosp-capabilities.test.mjs` (path + overlayable), `test/aosp-image-capability.test.mjs`, `scripts/aosp-capability-overlay.ts` (path).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | P13 (context) | The resource feeds the weaker `AlphaImageCapabilities.aospImage` gate; the stronger `AlphaImageCapability.verified` gate is a separate class (android research P13). The resource itself is correct and minimal. | None here; the twin-gate merge happens in Java. | — |

## Local types and helpers
| Name | Kind | Lines | Twin | Proposed home |
|---|---|---|---|---|
| `alpha_aosp_image_capability` | const (bool) | 4 | — | here |

## Proposed end state
Unchanged.

## Verification
`node --test test/aosp-capabilities.test.mjs test/aosp-image-capability.test.mjs`; AOSP overlay staging.
