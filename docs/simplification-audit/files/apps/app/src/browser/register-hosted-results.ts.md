# apps/app/src/browser/register-hosted-results.ts
- Lines: 6 | Role: side-effect module registering the AlphaHostedResults web plugin early | Verdict: DELETE (MERGE into register.ts)
- Importers: 1 (register.ts:4). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | D4/NEW (P12) | Exists only for first-registration-wins ordering; the comment claims it must run before native-connection, yet register.ts:3 imports native-connection first. | Make platform-plugins.registerPlugin attach a late `web` implementation, then register in register.ts and delete this file. | Medium: verify with hosted-results specs that AlphaHostedResults resolves to the web impl. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted. Estimated lines after: 0 (current 6).

## Verification
journey-f-hosted-result.spec.ts, dev-hosted-results.spec.ts.
