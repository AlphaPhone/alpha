# scripts/aosp-release-record.ts
- Lines: 26 | Kind: script (operator CLI: Alpha defaults for upstream `aosp-release-record.mjs`) | Verdict: MERGE into `scripts/aosp-tools.ts` (subcommand `release-record`)
- Covers: runs the shared release compatibility-record generator with `--product android/aosp/pixel10a-product.json`; re-exports `RECORD_KIND`, `compatibilityRecord`, `parseProperties`. Duplicates: same shape as `aosp-ota-update.ts`. Callers/importers: only `test/aosp-release-signing.test.mjs:16,204` (imports `RECORD_KIND`, spawns the CLI); no npm, workflow or doc caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | A7 | `compatibilityRecord`, `parseProperties` re-exported with no importer. | Delete; the test imports `RECORD_KIND` from upstream. | None |
| 2 | 22-23 | D14 | Cast because upstream types the `product` option as null-only. | Upstream follow-up. | None |
| 3 | whole | C5 | Thin binding of an upstream CLI. | Subcommand of `aosp-tools.ts`; document it in the release runbook (no doc names it today). | Low |

## Proposed end state
Gone as a file; `node scripts/aosp-tools.ts release-record …` with the Pixel 10a product default.
