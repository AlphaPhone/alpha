# test/aosp-staging-patches.test.mjs
- Lines: 75 | Kind: tooling integration (real git fixture; `reviewedSourceOverrides` + `verifySecureCameraSource`; `stagingBuildPatches` over vendor manifests) | Verdict: MERGE into `test/tooling/aosp.test.ts`; drop the vendor patch-content regex in test 3
- Covers: applied SystemUI patch overrides are admitted only with exact pre/post bytes, matching source lock and no overlap; host build patches are explicit, target-bound and pinned to the stallion lock. Duplicates: `test/aosp-cuttlefish.test.mjs` test 3 (`stagingSystemuiPatches` twin); `test/aosp-release-signing.test.mjs` test 10 checks that production staging requires `soong-app-native`. Callers/importers: `npm test`; imports `scripts/stage-aosp.ts`, `scripts/aosp-secure-camera-contract.ts`, `test/fixtures/git-fixture.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-48 | - | Real override admission with tamper cases; keep. | Move. | none |
| 2 | 57-62, 67-69 | T5 | Re-derives vendor lock hashes and commits; checks vendor manifest shape. | Keep one assertion that the admitted manifest is bound to the pinned lock; drop the rest. | none |
| 3 | 71-73 | T1, T5 | Regex over a vendor patch file. | Delete. | none |
| 4 | 51-56 | C5 | Same table shape as `stagingSystemuiPatches` in aosp-cuttlefish. | One table over both. | none |

## Proposed end state
Two cases in `test/tooling/aosp.test.ts`: patch-override admission (git fixture) and the named-patch table shared with
the SystemUI bundle admission.
