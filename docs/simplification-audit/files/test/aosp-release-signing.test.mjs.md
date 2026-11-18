# test/aosp-release-signing.test.mjs
- Lines: 267 | Kind: tooling integration (openssl throwaway certs, python3-built target-files zips, upstream releasetools doubles, spawned `stage-aosp.ts`, `aosp-release-record.ts`, `aosp-ota-update.ts`); plus committed-state and re-export checks | Verdict: MERGE into `test/tooling/release-signing.test.ts` (AOSP section); DELETE test 7 (clock re-export) and the vendor `BOARD_AVB_` regex
- Covers: Alpha's Pixel 10a descriptors admit the public signers and keep distribution pending drills; each descriptor gap is refused; staging option rules; production staging refuses missing trust identity and missing Soong patch before IO; signing produces a record bound to Alpha's product/channel; the OTA client defaults to Alpha's channel; `releaseBlockers` judges signer, platform certificate and Cloud voice evidence. Duplicates: `test/aosp-retain-known-good.test.mjs` (channel default); `test/aosp-product-lock.test.mjs` (same refusal pattern); upstream `vendor/eliza/packages/os/scripts/__tests__` tests the signing job itself (header comment). Note: research `tests-host.md:494` says "runs a Python unittest"; it does not, python3 only builds zips. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 98-119 | - | `pixel10aProductProblems(root)` deep-equals `[]` on the committed descriptors: a real release-readiness gate for the committed data, but it also asserts literals (`releaseQualified false` etc.). | Keep the `problems == []` and drill-pending assertions; drop literal equality lines 100-105. | none |
| 2 | 167-173 | T1, T5 | Regex over vendor `pixel10a/*.mk`; `git ls-files` for key-file extensions under `android/aosp`. | Delete the vendor regex. Move the "no key material committed" check to a repository secret-scan step in CI (owner decision) rather than a unit test. | Low |
| 3 | 244-249 | T5 | Asserts Alpha's re-exports are identical objects to the vendor module and a constant list. | Delete; consider deleting the pass-through re-exports in `scripts/aosp-clock-contract.ts` (D4). | none |
| 4 | 225-242 | - | `releaseBlockers` table: release gate logic, keep. Line 233-235 branches on committed signer state (test result depends on repo data). | Keep the fixed-signer rows; drop the committed-signer branch. | none |
| 5 | 31-33 | C7 | Builds zips by spawning python3 with an inline program. | Build zips in JS (shared helper with aosp-pixel10a). | none |
| 6 | 175-207 | - | Slowest case (openssl, signing doubles, spawned CLI); real and unique. | Keep. | none |

## Proposed end state
About 200 lines in `test/tooling/release-signing.test.ts` ("AOSP release"): descriptor admission and refusal table,
option matrix, two pre-IO CLI refusals, the signing binding run, the OTA client default, and the release-blocker table.
No vendor-text, re-export identity or committed-literal assertions.
