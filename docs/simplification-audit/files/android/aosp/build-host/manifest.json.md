# android/aosp/build-host/manifest.json
- Lines: 16 | Role: review manifest for the host-only Soong patch `soong-memory.patch` (project, revision, baseline lock digest, patch digest, per-file before/after digests). | Verdict: KEEP (owner question: move upstream)
- Importers: `scripts/pixel10a-source-contract.ts:49-55` `aospBuildPatch('soong-memory')` reads it by directory path; used by `scripts/stage-aosp.ts` / `scripts/verify-pixel10a-source.ts` via `--applied-build-patch soong-memory`. Text/path pins: `test/aosp-staging-patches.test.mjs:50-62` (asserts `baselineLockSha256` equals the vendored `pixel10a-stallion.json` digest, `revision` equals the lock's `build/soong` commit, `files` = `['ui/build/soong.go']`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C7 | The sibling patch `soong-app-native` lives upstream at `vendor/eliza/packages/os/android/patches/soong-app-native/` and is loaded by `soongAppNativePatch()`; `soong-memory` is the only build patch kept locally, with its own hand loader (`pixel10a-source-contract.ts:51-55`). The patch is product-neutral ("Host build only ... No default is changed"). | Owner question: upstream it next to `soong-app-native`, then delete `android/aosp/build-host/` and the local branch in `aospBuildPatch`. | Low |
| 2 | 4 | C6 | `baselineLockSha256` `760a7184…` duplicates `pixel10a-product.json` `sourceLock.sha256`; both must change on a lock bump. | Keep (test enforces equality); note as a coordinated edit on lock bumps. | — |
| 3 | 9-15 | B5 | `files[].beforeSha256/afterSha256` are not read by `aospBuildPatch` (it checks only `patchSha256`); only `test/aosp-staging-patches.test.mjs:61` checks they are 64-hex. Consumer of the `manifest` object is the upstream `verifyDeviceSource` (`appliedPatches`), which may read them — not verified here. | Leave until upstream consumer is checked; if unread, drop `files` and the test line. | Low |

## Local types and helpers
None.

## Proposed end state
Unchanged (16), or moved upstream with the patch.

## Verification
`node --test test/aosp-staging-patches.test.mjs`; Pixel 10a staging dry run with `--applied-build-patch soong-memory`.
