# specs/quint/refinement/application/google-access-publication.mjs
- Lines: 183 | Kind: Quint refinement harness; esbuild bundle of the real `runtime/google-agent-access.ts` with three import-specifier ports | Verdict: KEEP (two small fixes)
- Covers: Google agent access choices are serialized by a Web Lock, a reviewed Calendar choice is invalidated by a newer revision, a lost or failed native write triggers a corrective republish that keeps the original error. Duplicates: run by `test/quint-google-access-publication.test.mjs` and the aggregate `index.mjs:73` (T4). Callers/importers: those two.
- Model: `GoogleAccessPublication.qnt`, live (sources `runtime/google-agent-access.ts`, `browser/device-preferences.ts`, `browser/preference-documents.ts`, `browser/domain-document.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 11 | P6 | Imports `deferred` from `specs/quint/legacy/core/source-support.mjs` and lists that file as an input. This is one of the three live harnesses that block retiring `specs/quint/legacy` (ci-and-formal §2.10). `./support.mjs` already exports an identical `deferred`. | `import {deferred} from './support.mjs'`; drop the legacy path from `inputs`. | Low |
| 2 | 29-31 | B5 | Asserts every compiled input is in a hand-written allow-list (incl. `package-lock.json`). Any new import in `google-agent-access.ts` fails the campaign without a behaviour change. | Delete the allow-list check. | Low |
| 3 | 18-28 | – | Good: real bundle, ports only for `./documents`, `./local-agent`, `@capacitor/core`. | Keep. | – |
| 4 | 38-39 | – | Seeds the stored envelope `{version:1, legacy:null, value}`; still the current format after D1 (`domain-document.ts` writes `legacy: null`). | None. | – |

## Proposed end state
Same harness with the support import and without the input allow-list. One runner. Survives removal of `specs/quint/legacy`.
