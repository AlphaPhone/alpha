# android/aosp/brand.alphaphone.json
- Lines: 20 | Role: upstream elizaOS brand-config instance (package, product, lunch target, device tree, vendor dir) for the Cuttlefish validation product | Verdict: KEEP
- Importers: `android/aosp/product.json:6` (`brandConfig`), read by `scripts/stage-aosp.ts` (product descriptor loader) and upstream `vendor/eliza/packages/os/scripts/android/brand-config.ts` (required-field list incl. `distroName`, `classPrefix`, `initRcName`, `cuttlefishMakefile`), `boot-validate.ts`, `build-aosp.ts`. Text/path pins: `test/aosp-product-lock.test.mjs:25,39,70,78,80` (reads + mutates fields, regex on `packageName`/`lunchTarget`), `test/verify-apks.test.mjs:37`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C6 | `"packageName": "ai.alphacompute.alphaphone"` repeats `app.config.json` appId; the schema is upstream-owned and `aosp-product-lock.test.mjs:78` asserts equality. | None (upstream schema requires the field; the equality check is the single guard). | — |
| 2 | 14-19 | A7 (checked) | `envPrefix`, `propertyPrefix`, `initRcName`, `commonMakefile`, `cuttlefishMakefile`, `classPrefix`, `distroName` have no reader in this repo (git grep: only this file) but are required by upstream `brand-config.ts:53` field list. | None. Not unused. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged, 20 lines.

## Verification
`node --test test/aosp-product-lock.test.mjs test/verify-apks.test.mjs`; `scripts/stage-aosp.ts --production` descriptor checks.
