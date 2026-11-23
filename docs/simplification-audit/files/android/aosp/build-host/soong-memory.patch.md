# android/aosp/build-host/soong-memory.patch
- Lines: 15 | Role: 6-line Go patch to AOSP `build/soong/ui/build/soong.go` that forwards `GOGC`/`GOMEMLIMIT` into the Soong bootstrap environment on memory-constrained build hosts. | Verdict: KEEP (owner question: MOVE to `vendor/eliza/packages/os/android/patches/soong-memory/` upstream)
- Importers: named by `android/aosp/build-host/manifest.json:6`; digest checked by `scripts/pixel10a-source-contract.ts:54`. Pins: `manifest.json` `patchSha256`. Nothing in this repo sets `GOMEMLIMIT` (grep: only this patch), so it is opt-in for whoever builds the image.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C7 | Product-neutral host build fix kept in the product repo while its sibling `soong-app-native` is upstream. | Upstream it (see `build-host/manifest.json.md`). | Low |

## Local types and helpers
None.

## Proposed end state
Unchanged, or moved upstream.

## Verification
`test/aosp-staging-patches.test.mjs`; an AOSP host build with `GOMEMLIMIT` set.
