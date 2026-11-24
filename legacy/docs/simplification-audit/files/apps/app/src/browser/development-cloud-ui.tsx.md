# apps/app/src/browser/development-cloud-ui.tsx
- Lines: 33 | Role: development Cloud account fixture UI (sample account picker, scenario reset, recovery buttons) driving the production `CloudPersonalSetup` review component. | Verdict: MOVE to `dev/`; DELETE if the personal-Cloud path is removed (D5, owner)
- Importers: 1 (`runtime/connection-ui.tsx`). Text/path pins: `test/support/feature-parity.mjs`; behaviour in `test/browser/dev-cloud-scenarios.spec.ts`, `cloud-setup-migration.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | D5 (P1) | `export const DevelopmentCloudSetup=devSurfacesEnabled?DevelopmentCloudFixture:()=>null;` — export fold, one of four gating layers. | Remove once the module sits behind the single `dev/` dynamic import. | Medium (bundle audit) |
| 2 | 26, 28 | A3 | "Cloud account recovery" / "Cloud setup recovery" buttons open `openDomainRecovery` backup/reset dialogs (backup = D3). | Delete both buttons and `developmentAccountRecovery`/`developmentCloudSetupDocument` imports. | Low |
| 3 | — | A3 | Exercises `CloudPersonalSetup`/`cloud-personal-protocol`, which `research/app-runtime-a-m.md` §3 lists for deletion (PRD "No hosted-agent pairing"). | Owner decision: if personal Cloud goes, delete this file with `development-cloud*.ts` and the dev-cloud specs. | — |
| 4 | 15, 21, 27 | C3 | `setSetup({view:null,blocked:false,declined:false})` written three times. | `const idle={…}`. | None |
| 5 | 26-30 | D8 | 1,500-character JSX lines. | Format. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SetupProps` | type | 8 | none | keep |

## Proposed end state
~25 lines in `dev/` without recovery buttons or export fold — or deleted with the personal-Cloud path.

## Verification
`test/browser/dev-cloud-scenarios.spec.ts`; production bundle audit.
