# test/native-view-fallback-installation.test.mjs
- Lines: 27 | Kind: transplant of upstream `vendor/eliza/packages/agent/src/api/view-installations.ts` (imports stripped, evaluated in `vm`) plus `scripts/native-view-policy.ts` declarations | Verdict: DELETE
- Covers: the upstream Inbox plugin view and Alpha's native fallback declaration coexist in either install order and the fallback returns when the plugin is revoked. Duplicates: none in Alpha; upstream registry behaviour. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T2, T5 | Reads the vendor checkout as text and evals it. | Delete; upstream follow-up (registry collision test). | Low |
| 2 | 15-16 | - | Alpha's only part: `nativeViewDeclarationsJson` contains `inbox`. | Covered by the agent bundle build and the inbox journey. | None |

## Proposed end state
File deleted.
