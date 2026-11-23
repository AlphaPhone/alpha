# apps/app/src/browser/development-cloud-document.ts
- Lines: 17 | Role: per-sample-account development Cloud setup state (scenario, phase, quote). | Verdict: MERGE into `development-cloud.ts` (sole importer); DELETE with the development Cloud fixture if D5 removes it
- Importers: 1 (`development-cloud.ts:4-5`). Text/path pins: `test/support/feature-parity.mjs`; behaviour in `test/browser/cloud-setup-migration.spec.ts` (A1), `dev-cloud-scenarios.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | A1 | Legacy reader `()=>localStorage.getItem(key)`. | Drop. | Low |
| 2 | 12-15 | B3 (P6) | `await check(signal)` before and after every call and inside the editor. | One check at entry. | Low |
| 3 | 10 | B3 (P7) | 400-character `validate` on own writes. | Delete. | Low |
| 4 | 4-7 | C6 | Scenario list `['new','existing','insufficient','failed','changed']` also in `development-cloud.ts:12` and the `<option>`s in `development-cloud-ui.tsx:29`; `'first'\|'second'` duplicates `DevelopmentAccount`. | One `developmentScenarios` const; import `DevelopmentAccount`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DevelopmentScenario` | type | 4 | literal list in `development-cloud.ts:12` | `development-cloud.ts` |
| `DevelopmentSetup` | type | 5 | none | `development-cloud.ts` |

## Proposed end state
File removed; ~6 lines in `development-cloud.ts`.

## Verification
`test/browser/dev-cloud-scenarios.spec.ts`.
