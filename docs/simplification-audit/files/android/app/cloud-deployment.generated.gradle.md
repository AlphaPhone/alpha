# android/app/cloud-deployment.generated.gradle
- Lines: 5 | Role: generated Gradle `ext.alphaCloudWebHosts` (production/staging web hosts) from `scripts/cloud-deployment-policy.ts`. | Verdict: KEEP
- Importers: `android/app/product.gradle:26-28` (`apply from:`; uses `.production`, `.staging`). Writer/checker: `scripts/cloud-deployment.ts:69-87` (`--check` runs first in `npm run verify`). Path pins: `scripts/source-snapshot.ts:11`, `specs/quint/refinement/application/account-sheet.mjs:78` (input list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | D6 (note) | Generated file lives beside hand-written Gradle in `android/app/`. It is checked by `cloud-deployment.ts --check`, so drift is caught. | None. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `alphaCloudWebHosts` | const (Gradle ext) | 2-5 | generated twins of the same policy in `apps/app/src/**/cloud-deployment.generated.*` and Java | stays generated |

## Proposed end state
Unchanged (5).

## Verification
`node scripts/cloud-deployment.ts --check`; Android build.
