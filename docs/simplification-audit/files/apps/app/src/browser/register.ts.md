# apps/app/src/browser/register.ts
- Lines: 41 | Role: registers every web Capacitor plugin implementation for non-native builds | Verdict: SIMPLIFY
- Importers: 1 (main.tsx:3). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | A8/NEW (P12) | Comment "must be the first import in main" is false: main.tsx:1 imports runtime/voice-entry-policy first. | Fix registration order dependence (late web attach) and delete the comment. | Medium. |
| 2 | 3-4 | NEW (P12) | Import order (`native-connection` before `register-hosted-results`) contradicts register-hosted-results comment. | Fold hosted-results registration here. | Medium. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Same registrations plus AlphaHostedResults; no ordering comments. Estimated lines after: 40 (current 41).

## Verification
app boot in browser (any journey spec), native-plugin-startup.spec.ts.
