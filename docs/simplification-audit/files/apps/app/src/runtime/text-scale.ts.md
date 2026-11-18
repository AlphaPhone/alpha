# apps/app/src/runtime/text-scale.ts
- Lines: 46 | Role: measures effective text zoom with a hidden probe and publishes `--alpha-text-scale` and `alpha-large-text`/`alpha-text-xl` classes. | Verdict: KEEP (MOVE to `ui/`/bootstrap; minor)
- Importers: `main.tsx:84,87` (`installTextScale`, `TEXT_SCALE_PROPERTY`), `scripts/test-native-restart.ts:20`.
- Text/path pins: `test/accessibility-coverage.test.mjs:274` (asserts `installTextScale()` text in main.tsx; reads this file), `test/browser/startup-access.spec.ts`, `specs/quint/application/manifest.json`, `feature-parity.mjs`; CSS consumers in `prototype/phone.css` (classes/property names).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39 | C6 | `scale >= 1.5` literal next to `TEXT_XL_ABOVE = 1.5`. | `LARGE_TEXT_AT=1.5` constant. | None |
| 2 | 17, 20 | A7 | `LARGE_TEXT_CLASS` (0/0) and `TEXT_XL_CLASS` (test-only) exported. | Unexport. Class names stay (CSS uses them). | None |
| 3 | 45 | B4/D7 | the returned uninstaller is discarded by `main.tsx:399`. | Keep only if a test needs it; otherwise return void. | Low |
| 4 | — | D11 | DOM installer in `runtime/`. | Move to `ui/` or `bootstrap/`. | Low |

## Local types and helpers
None with twins.

## Proposed end state
~40 lines, same behaviour, constants for both thresholds.

## Verification
`test/accessibility-coverage.test.mjs`, `test/browser/startup-access.spec.ts`, large-text visual checks.
