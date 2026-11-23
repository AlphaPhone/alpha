# scripts/aosp-image-capability.ts
- Lines: 17 | Kind: pass-through re-export of `vendor/eliza/packages/os/scripts/android/image-capability.mjs` | Verdict: DELETE
- Covers: nothing of its own (a doc comment plus five re-exports). Duplicates: the upstream module; `aosp-capability-overlay.ts` binds the same module. Callers/importers: `scripts/stage-aosp.ts:15` (`writeImageCapability`); `test/aosp-image-capability.test.mjs:9` (and `:74` regex-matches this file's import line: T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-17 | D4/A7 | Pure re-export; `IMAGE_FEATURE_VERSION`, `imageFeatureName`, `renderImageCapability`, `stagedImageFeature` have no product caller. | `stage-aosp.ts` imports `writeImageCapability` from upstream; delete the file. | None |
| 2 | — | T1/T5 | Its test asserts the import line by regex and re-tests the upstream generator. | Delete `test/aosp-image-capability.test.mjs` (upstream owns that coverage). | None |

## Proposed end state
Deleted. The doc comment's useful fact (Pixel 10a writes the declaration itself; `stage-aosp.ts` writes it for Cuttlefish/generic) moves to a comment at the `stage-aosp.ts` call.
