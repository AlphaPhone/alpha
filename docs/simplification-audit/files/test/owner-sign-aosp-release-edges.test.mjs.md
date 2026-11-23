# test/owner-sign-aosp-release-edges.test.mjs
- Lines: 279 | Kind: tooling integration (real `signRelease` from `scripts/sign-aosp-release.ts` over throwaway openssl certificates, generated RSA/AVB keys, python3-built target-files zips and upstream releasetools test doubles in `vendor/eliza/packages/os/scripts/__tests__/fixtures/aosp-releasetools`) | Verdict: MERGE into `test/tooling/release-signing.test.ts` (AOSP section)
- Covers: Pixel 10a release signing edge cases: managed (PKCS#11 / AVB helper / payload signer) options are all-or-nothing and well formed, a managed key directory holds no private key and its public AVB keys match the enrolled digests, APEX container/payload keys are required and pinned in key-file mode, presigned APEXes are left alone, a signed APEX still carrying the test payload key stops before any OTA, a substituted APEX payload pair is refused. Duplicates: `test/aosp-release-signing.test.mjs:31-97` duplicates the whole fixture layer (`zip`, `temporary`, `certificate`, `keyDirectory`, `completeRoot`, `releasetools`, `targetFiles`, `sha256`, `read`, constants). Research row `tests-host.md:929` ("runs a Python unittest") is wrong: python3 only builds zips. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-147 | C3 / T7 | Fixture layer is a near-copy of `aosp-release-signing.test.mjs` (same helpers, extended with `managed`, APEX and mock options). | One shared fixture section in the merged file (the richer version here is the base). | Low |
| 2 | 17-18 | B2 | Skips when the pinned vendor checkout is absent; the submodule is a hard requirement (README, tests-host.md:279). | Drop the skip. | Low |
| 3 | 38 | C7 | Builds zips by shelling to python3 with an inline script. | Use a Node zip writer (e.g. the one other tooling tests use) or keep python3 once in the shared fixture. | Low |
| 4 | 1-5 | A8 | Header names issue #672 and disclaims evidence at length. | One line: what is signed and that releasetools are doubles. | None |
| 5 | 149-279 | - | Cost: each test generates 3+ openssl certs and up to four RSA-2048 pairs per `setup` (about 15 setups); seconds, not minutes. | Run in the release-tooling lane only (path filter `scripts/sign-aosp-release.ts`, `scripts/aosp-*.ts`, `android/aosp/**`, `android/release-signer.json`). | Low |

## Proposed end state
`test/tooling/release-signing.test.ts` holds both files: one fixture block (temp dirs, certs, key directory in key-file or managed mode, complete root copy, releasetools doubles, target-files builder), then the committed-descriptor and staging cases from `aosp-release-signing.test.mjs` and the six edge cases here unchanged in substance (managed happy path, managed option refusals, managed key-dir refusals, APEX key-file refusals, test payload key after signing, substituted payload pair). The vendor-absent skip goes.
