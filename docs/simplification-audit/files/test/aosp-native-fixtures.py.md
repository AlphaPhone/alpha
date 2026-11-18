# test/aosp-native-fixtures.py
- Lines: 435 | Kind: tooling integration (Python unittest of `scripts/stage-aosp-native.py` on synthetic APK zips; runs `node scripts/native-view-policy.ts`; evaluates a regex-extracted expression from `scripts/prepare-local-agent.ts`) | Verdict: KEEP + SIMPLIFY; run it from the single Python runner (`test/tooling/python.test.mjs`) instead of `aosp-pixel10a.test.mjs:101`
- Covers: native-library staging for the image refuses compressed/non-ELF/foreign-ABI/traversal libraries, changed overlays, mixed runtime profiles, corrupted provenance, a self-consistent but unpinned Bun substitution, and installs exact bytes and `config.fs` modes for stallion and Cuttlefish. Duplicates: none; this is the only coverage of `stage-aosp-native.py` (called by `scripts/aosp-cuttlefish.ts:14` and `scripts/aosp-pixel10a.ts:97,102`). Callers/importers: spawned only by `test/aosp-pixel10a.test.mjs:101` (`stdio:'pipe'`, so failures show no Python output).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 134-136 | T2, T10 | Cuts `const stamp=(.+);` out of `scripts/prepare-local-agent.ts` with a regex and evals it under `node -e`. Any reformat (Prettier, D9) breaks it. | Export a `sourceStamp(root)` function from `prepare-local-agent.ts` and call it via `node --input-type=module -e "import ..."`. | Medium: blocks the formatter commit until ported. |
| 2 | 29-30 | - | Spawns node at import time (module load), even for tests that do not need it. | Compute lazily in `resident_fixture`. | none |
| 3 | 31-42 | C3 | `ELF` bytes and the `Android.bp` text are duplicated in `test/aosp-pixel10a.test.mjs:60-61`. | One fixture module for both once the Pixel test calls the Python staging through the runner. | none |
| 4 | 196-243, 391-413 | - | Long variant tables of refusal cases; each refusal asserts the overlay is untouched. Worth keeping; some variants overlap (missing-model vs changed-model-hash). | Leave as is; optionally trim to one case per refusal reason. | none |
| 5 | 263, 368 | D8 | `import configparser` inside test bodies. | Top-level import. | none |

## Proposed end state
Same scenarios, run once by `test/tooling/python.test.mjs` with visible output, no regex slice of a TypeScript file
(stamp comes from an exported function), one shared ELF/blueprint fixture.
