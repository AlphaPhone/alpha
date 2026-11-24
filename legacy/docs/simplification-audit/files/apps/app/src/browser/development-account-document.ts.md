# apps/app/src/browser/development-account-document.ts
- Lines: 37 | Role: development Cloud sample-account selection (first/second + session) as a domain document with cache, epoch and cross-tab invalidation. | Verdict: SIMPLIFY (dev module); DELETE if the development Cloud profile goes (D5, owner)
- Importers: 1 (`browser/development-cloud.ts:6-7`, re-exported to `development-cloud-ui.tsx`, `development-identity.ts`, `runtime/connection-ui.tsx:38`). Text/path pins: `test/support/feature-parity.mjs`; behaviour in `test/browser/cloud-account-migration.spec.ts` (A1 migration spec).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | A1 | Legacy reader `()=>{const rawAccount=localStorage.getItem(developmentCloudKey);…}` imports an old `localStorage` key. D1. | Drop the legacy lambda (with domain-document). Keep the `{rawAccount}` stored format. | Low (dev data) |
| 2 | 33 | A1 | `window.addEventListener('storage',…developmentCloudKey…)` watches a key nothing writes any more. | Delete. | Low |
| 3 | 19 | B4 (P1) | `if(!devSurfacesEnabled\|\|!browserDevProfile)` — `browserDevProfile` implies the flag. | `if(!browserDevProfile)`. | None |
| 4 | 11, 29, 32, 36 | C4 / B2 | Own `BroadcastChannel('alpha.browser.documents.v1')` with `typeof` guard and manual post/listen. | `observedDocument()` facade. | Low |
| 5 | 29, 36 | C3 | `epoch++;cache=…;ready=true;channel?.postMessage({key});window.dispatchEvent(new Event('alpha:development-account-changed'))` twice. | `publish(value)` helper. | None |
| 6 | 14-18 | B3 (P7) | `decode` validates bytes this module wrote. | Keep only the JSON parse; dev-only data. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DevelopmentAccount` | type | 6 | `'first'\|'second'` literal in `development-cloud-document.ts:6`, `development-identity.ts:8` | export here, import there |
| `valid` | helper | 13 | `['first','second'].includes` in `development-cloud-document.ts:7` | here |

## Proposed end state
~25 lines in `dev/`: observed document, single publish helper, no legacy reader or storage listener.

## Verification
`test/browser/dev-cloud-identity.spec.ts`, `dev-cloud-scenarios.spec.ts`; delete `cloud-account-migration.spec.ts` with A1.
