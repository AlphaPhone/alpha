# test/aosp-pixel10a.test.mjs
- Lines: 132 | Kind: tooling integration (`writePixel10aProduct` over the vendor stallion templates, runs `stage-aosp-native.py` through python3), constants check (test 1), wrapper (test 3), source-order check (end of test 4) | Verdict: MERGE into `test/tooling/aosp.test.ts` (tests 2, 4 minus source text, production overlay test); DELETE test 1 and the wrapper test 3
- Covers: the physical Pixel 10a overlay records every hardware template input, relocates only declared identities, keeps the existing product.mk, records no boot/signing claims, and refuses vendor API or layout drift before writing. Duplicates: test 1 asserts the same committed JSON as `test/aosp-release-signing.test.mjs` test 1 and `test/aosp-product-lock.test.mjs`. Callers/importers: `npm test`; imports `scripts/aosp-pixel10a.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18 | T1 | Asserts committed `pixel10a-composition.json` values equal literals. | Delete. | none |
| 2 | 20-53 | - | Strong integration check of template relocation and mode preservation. | Keep. | none |
| 3 | 60-61 | C3 | Builds a zip through `python3 -c` and duplicates the ELF and `Android.bp` fixtures of `aosp-native-fixtures.py`. | Build the zip in JS (or a shared fixture) and share the blueprint text. | none |
| 4 | 100-102 | T9 | Test that only spawns `test/aosp-native-fixtures.py` with `stdio:'pipe'`. | Delete; the Python runner runs that suite. | none |
| 5 | 127-131 | T1 | `indexOf` ordering of calls inside `scripts/stage-aosp.ts`. | Delete. | low |
| 6 | 71, 88 | C5 | Two near-identical `writePixel10aProduct` calls differing only in `production`. | One helper. | none |

## Proposed end state
Three cases in `test/tooling/aosp.test.ts` ("Pixel 10a overlay"): development overlay, production overlay, vendor API and
layout refusal. No committed-constant, source-order or wrapper tests.
