# test/enroll-release-keys.test.mjs
- Lines: 235 | Kind: tooling (imports `scripts/enroll-release-keys.ts` `main()` and runs it against temp copies of the three release records, with throwaway openssl certificates and the pinned upstream key generator) | Verdict: KEEP, MERGE into `test/tooling/release-signing.test.ts`
- Covers: the release-key enrollment CLI writes only public digests into `android/release-signer.json`, `android/aosp/product.json` and the update-channel record, refuses test/debug/reused/missing/swapped keys, is idempotent, and needs `--replace` for a rotation. Duplicates: none (no other test imports the script). Callers/importers: `npm test` (`scripts/run-node-tests.ts` glob). The script itself is an operator CLI named by `scripts/android-build-preflight.ts:290` and `android/signing/alpha-key-manifest.json:4`; no workflow runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 84-95 | T1 / B3 | First case asserts the committed key list equals a literal array of 12 names and equals the upstream manifest row by row. That is a check of committed data, not of the script. The useful part (the pinned upstream `loadKeyManifest` accepts Alpha's list, and every `ENROLLMENT` row reads a listed key) is a release-input invariant. | Drop the literal name list (line 87). Keep the upstream-acceptance and ENROLLMENT/IMAGE_CERTIFICATES coverage, ideally as a check inside `enroll-release-keys.ts` itself (it already loads both files) so it runs when the tool runs. | Low |
| 2 | 97-117 | cost | Runs the upstream `generate-release-keys.ts --test-keys`, which creates a full key set (12 keys, AVB keys) per run. | Keep (it is the only proof that a real test-key ceremony is refused), but it is the slowest case; note it in the merged suite. | Low |
| 3 | 52-76, 119-228 | cost | `ceremony()` spawns `openssl req` once per x509 key (about 10 per call) and is called five times: about 50 openssl processes per run. | Generate one ceremony per test file (`before`) and clone its `fingerprints.json` for the mutation cases; only the conflict case needs a second ceremony. | Low |
| 4 | 19, 21-25 | C3 | Local `sha256` and `scratch` helpers duplicate the twins in `test/support` and `scripts/lib`. | Import the shared helpers when the tooling suite is created. | Low |
| 5 | 147-161 | T1 (mild) | Asserts the written JSON keeps an inline `chainedPartitions` layout and that only digest lines change, by regex over the written text. This is a check of `formatRecord` output, which the tool owns; acceptable. | Keep. | Low |
| 6 | 230-235 | tooling | Committed records round-trip byte for byte through `formatRecord`. Cheap and guards the "only digests change" property for real records. | Keep. | Low |

## Proposed end state
One `describe('enroll-release-keys')` block inside `test/tooling/release-signing.test.ts`, alongside
`sign-release-apks`, `record-release` and `publish-update-manifest`. Cases kept: test-key refusal (generator),
dry run / write / idempotent repeat, conflict vs `--replace`, the refusal table (reused, debug, missing, extra,
AOSP subject, verify-apks debug row, swapped public files, missing `--fingerprints`), committed-record round trip.
The key-list agreement moves into the script as a startup check. One shared ceremony fixture per run.
