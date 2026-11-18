# test/apk-signer-range.test.mjs
- Lines: 12 | Kind: unit of an upstream function (`parseSignerDigest` is `parseApkSignerDigest` re-exported, `scripts/apk.ts:260`) | Verdict: DELETE
- Covers: apksigner output parsing for legacy and rotated signers by API level. Duplicates: upstream `vendor/eliza/packages/app/scripts/mobile/artifact-inspection/apk-distribution.test.mjs` (10 references to `parseApkSignerDigest`). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-12 | T5, D4 | Tests vendor code through a cast-only re-export. | Delete; consider importing the upstream name directly in `apk.ts` callers. | none (upstream covers it) |

## Proposed end state
Gone.
