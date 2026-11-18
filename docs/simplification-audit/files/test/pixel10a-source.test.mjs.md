# test/pixel10a-source.test.mjs
- Lines: 104 | Kind: tooling (real git repositories in a temporary folder; runs upstream `verifyDeviceSource` through the Alpha adapter `scripts/pixel10a-source-contract.ts`) + one config-consistency check | Verdict: DELETE
- Covers: Pixel 10a AOSP source admission. Exact factory, revision, generated kernel and overrides; refusal of untracked, ignored, assume-unchanged and local-manifest changes; reviewed applied patches. Plus that the product JSON pins the upstream lock's sha256. Duplicates: `vendor/eliza/packages/os/scripts/__tests__/device-source-inventory.node.test.ts` (upstream tests `verifyDeviceSource`); `scripts/stage-aosp.ts:221` refuses production staging when the verified lock sha differs from `android/aosp/pixel10a-product.json`. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-96 | T5 | Every fixture passes an explicit `lock` that is not `defaultLockPath`, so `verifyPixel10aSource` dispatches straight to upstream `verifyDeviceSource`. Ten tests exercise upstream code; the adapter's own branch (the default profile lock) is never run. | Delete. Upstream owns these rules and their tests. | none |
| 2 | 98-104 | T1 | Asserts `defaultLockPath`, the absence of `android/aosp/pixel10a-source.json` (a tombstone, A8), and that the product JSON's `sourceLock.sha256` equals the upstream file's hash. | Delete. The sha equality is a staging rule `stage-aosp.ts` already enforces for production. If it should fail earlier, check it in `npm run verify`'s upstream-lock check rather than in a test. | low |
| 3 | 13-17 | cost | `git init` and two commits per fixture, about 12 fixtures per run. | Gone with the file. | none |

## Proposed end state
Deleted. `scripts/verify-pixel10a-source.ts` (no caller, `research/scripts.md:784`) merges into `stage-aosp.ts` as the scripts report proposes.
`pixel10a-source-contract.ts` stays, because `stage-aosp.ts` uses it.
