# test/native-connection-headers.test.mjs
- Lines: 52 | Kind: transplant (slices `apps/app/src/runtime/native-connection.ts` from `/** Browser AlphaConnection:` to `let browserConnection:`, strips types, runs in `vm`) | Verdict: REWRITE as a real-import case in `test/integration/connection-cloud.test.mjs`
- Covers: the browser transport forwards the Maps `Idempotency-Key` only on the exact Maps POST routes with a well-formed value and refuses it elsewhere. Duplicates: `managed-service-routes.test.mjs` (`mapsRequestIdentity` rows 75-84 test the same rule at the policy level). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-19 | T2 / D7 | Comment-marker slice and vm sandbox with eight hand-supplied globals. | Delete the slice. `createBrowserConnection` is exported; import it once `native-connection.ts` loads under the test loader (needs the `import.meta.env` shim removal/`build-flags` boundary from D5). | Medium |
| 2 | 22-52 | - | Header forwarded only on Maps POST routes; bad values refused before fetch. | Carry two cases (forwarded on `routes`; refused on `capabilities` and on a malformed value) against the real export. | Low |

## Proposed end state
File deleted; two cases in the connection-cloud integration file call the real `createBrowserConnection` with a recording `fetch`.
If the module still cannot be imported in Node after stage F, keep only the policy rows in `managed-service-routes` and drop this.
