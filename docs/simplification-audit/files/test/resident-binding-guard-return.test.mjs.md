# test/resident-binding-guard-return.test.mjs
- Lines: 20 | Kind: transplant (slices `bindResidentCloudProvider` out of `local-agent.ts`) | Verdict: DELETE
- Covers: binding returns an existing native guard without reconfiguring; configure errors reject. Duplicates: `scripts/test-resident-reuse.ts` (imports the real `bindResidentCloudProvider`), `test/resident-prebind-stop.test.mjs`. Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | T2 | Marker slice to `/** Automatic failed-bind cleanup` and `new Function` with stubbed collaborators. | Delete. | Low |
| 2 | 11-16 | A1 | "legacy void configure stays undefined" exercises a legacy native return shape. | Delete with the legacy branch in `local-agent.ts` if the native plugin always returns a guard. | Low |

## Proposed end state
File deleted. Binding is exercised end to end by the connection-cloud journey (resident stub `configureCloudProvider`).
