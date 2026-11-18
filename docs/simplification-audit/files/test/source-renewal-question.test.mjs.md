# test/source-renewal-question.test.mjs
- Lines: 29 | Kind: transplant-lite (esbuild-bundles real `runtime/source-renewal-question.ts` with `content-question`, `alpha-client`, `hosted-digests` replaced by fixtures) | Verdict: DELETE
- Covers: Asking about a source-renewal notice requires matching owner/agent/installation/enrollment/source/revision and a current token; cancel and lifecycle close keep the notice pending. Duplicates: `test/quint-source-renewal-question.test.mjs` and aggregate `checkSourceRenewalQuestion` (application index) refine the same module; `test/browser/digest-source-renewal.spec.ts` drives the UI. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | T2/D8 | Bundler plugin with three inline stubs on one 700-character line. | Delete. | Low |
| 2 | 8-29 | T4 | One test with seven scenarios that the Quint refinement and the browser spec already exercise. | Delete. | Low |

## Proposed end state
File deleted.
