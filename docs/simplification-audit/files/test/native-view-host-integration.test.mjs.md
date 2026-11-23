# test/native-view-host-integration.test.mjs
- Lines: 12 | Kind: integration of upstream modules only (esbuild bundles four `vendor/eliza` agent/plugin files with a two-export slice of `@elizaos/core`) | Verdict: DELETE
- Covers: upstream view interaction host correlates one native renderer response, rejects foreign client/owner/installation, rejects on disconnect/timeout without redispatch, and the resident event feed authenticates before registration. Duplicates: none in Alpha. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-4 | T5 | No Alpha code is executed. | Delete; upstream follow-up. | Low |
| 2 | 3 | T10-like | A hand-made `@elizaos/core` replacement exporting two symbols. | Gone. | None |
| 3 | 6-12 | D8 | Each test is one line of several hundred characters. | Gone. | None |

## Proposed end state
File deleted; listed as an upstream test follow-up.
