# apps/app/src/runtime/cloud-environment-selection.ts
- Lines: 25 | Role: decides `production` vs `staging` Cloud environment from build flags and a saved/selected value; the core carries LemmaScript `//@ ensures` contracts. | Verdict: SIMPLIFY (small)
- Importers: `connection-ui.tsx:20` (`resolveCloudEnvironment` at 506, 3814, 3821), `scripts/test-connection-history.ts`.
  Text/path pins: `LemmaScript-files.txt:14`, `specs/lemma/apps/app/src/runtime/cloud-environment-selection.dfy(.gen)` (Dafny proof generated from the `//@` annotations — names `resolveCloudEnvironmentCore`, `CloudEnvironmentPolicy` and field names are pinned), `specs/lemma/README.md:191`, `specs/quint/services/manifest.json`, `test/cloud-environment-selection.test.mjs` (type-strip transplant, T2), `test/notice-owner-startup.test.mjs`, `test/support/feature-parity.mjs:482`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-8 | D4 / B3 | `resolveCloudEnvironment(policy:{…previewEnvironment?: unknown; cloudResident?:boolean}, selected?: unknown)` only adapts loosely typed input to the core (`previewEnvironment === 'staging'`, `!!cloudResident`, `typeof selected === 'string' ? selected : ''`). The one caller already builds the policy from typed build flags (`connection-ui.tsx:208`). | Build a `CloudEnvironmentPolicy` directly in `connection-ui.tsx:208` (`previewStaging: import.meta.env.VITE_ALPHA_CLOUD_ENVIRONMENT === 'staging'`) and call the core; keep `selected` coercion at the storage read only. Delete the wrapper (5 lines). | Low; the Dafny proof covers only the core, so it is unaffected. |
| 2 | 11 | C1 | Return type `'production' \| 'staging'` restates `CloudEnvironment` (imported on line 1 but used only by the wrapper). | Return `CloudEnvironment` (the `.dfy` uses `string`; LemmaScript accepts the alias — confirm with `npm run lemma`). | Low. |
| 3 | — | C5 | Three predicates answer "which environment may this build use": this file, `connection-ui.tsx:209 cloudEnvironmentAllowed`, `cloud-protocol.ts:52 cloudEnvironmentAvailable` (test-only). | Add `cloudEnvironmentAllowed(policy, env)` here (one more pure core function with an ensures clause) and delete the other two. | Medium: new Lemma annotation; `connection-ui.tsx:315,887,2660` callers. |
| 4 | 21, 24 | D5 | In product (`development=false`) the result is always `production`; the `cloudResident`/`previewStaging` arms are developer-only. | Keep (verified, tiny); revisit only if the flag zoo collapse (D5) removes `browserCloudResident`. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudEnvironmentPolicy` | type | 9 | ad-hoc literal object in `connection-ui.tsx:208` | keep here |
| `resolveCloudEnvironment` | helper (wrapper) | 4-8 | — | delete (inline at caller) |
| `resolveCloudEnvironmentCore` | helper | 11-25 | `connection-ui.tsx:209 cloudEnvironmentAllowed`, `cloud-protocol.ts:52 cloudEnvironmentAvailable` | keep here, add allowed-predicate |

## Proposed end state
Only `CloudEnvironmentPolicy`, `resolveCloudEnvironmentCore` (annotated) and a new annotated `cloudEnvironmentAllowed`. ~22 lines.

## Verification
`npm run lemma` / Dafny regeneration for `cloud-environment-selection.dfy`, `test/cloud-environment-selection.test.mjs` (delete per T2 or rewrite as import), `test/notice-owner-startup.test.mjs`, `scripts/test-connection-history.ts`, `npm run verify`.
