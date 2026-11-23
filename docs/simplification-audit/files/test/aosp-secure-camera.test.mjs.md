# test/aosp-secure-camera.test.mjs
- Lines: 59 | Kind: tooling integration (real git repo fixture; fake adb runner for image checks; overlay writer) | Verdict: MERGE into `test/tooling/aosp.test.ts`
- Covers: Camera2 source admission refuses unreviewed commits, byte drift, hidden index flags, ignored or untracked files and changed overrides; image verification only reads system routing and rejects each wrong fact; the staged overlay selects Camera2 and the power gesture. Duplicates: `test/aosp-staging-patches.test.mjs` test 1 also calls `verifySecureCameraSource` with patch overrides (complementary). Callers/importers: `npm test`; imports `scripts/aosp-secure-camera-contract.ts`, `test/fixtures/git-fixture.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-27 | - | Real git-backed refusal cases; keep. | Move. | none |
| 2 | 40-52 | - | Read-only command assertion (no start/grant/put/install) is a useful safety property of the verifier. | Keep. | none |
| 3 | 11-26 | D8 | Dense one-line statements. | Formatter. | none |

## Proposed end state
Same cases in `test/tooling/aosp.test.ts` ("secure camera"), formatted.
