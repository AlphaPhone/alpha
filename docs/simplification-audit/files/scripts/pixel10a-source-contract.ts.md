# scripts/pixel10a-source-contract.ts
- Lines: 56 | Kind: build library (AOSP staging) | Verdict: KEEP, SIMPLIFY
- Covers: Alpha binding of upstream's Pixel 10a source admission (profile lock vs fixture lock), the SystemUI listener patch re-export and the two host-build patches (`soong-app-native`, `soong-memory`). Duplicates: none in product. Callers/importers: `stage-aosp.ts`, `verify-pixel10a-source.ts` (15-line CLI wrapper); `test/pixel10a-source.test.mjs`; `test/aosp-pixel10a.test.mjs` slices `stage-aosp.ts` text around `verifyPixel10aSource({`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-32, 37-40 | B2/D4 | Two `as (...) => ...` casts re-type vendor `.mjs` functions. | Upstream follow-up: ship `.d.ts`; then call directly. | none |
| 2 | 11 | C3 | Local sha256 helper. | Shared helper. | none |
| 3 | 13-14 | — | Doc comment sits above the `ReviewedSourcePatch` interface instead of the function it describes. | Move it. | none |
| 4 | 26-43 | D10 | Branches on "is the lock the default path" to pick between two upstream verifiers; the fixture path exists for tests. | Owner/upstream: one verifier taking a lock path. | low |
| 5 | — | T5 | `test/pixel10a-source.test.mjs` (11 cases) mostly drives upstream `verifyDeviceSource` through fixture repos; asserts `defaultLockPath` and the product source-lock hash (constants). | Delete; upstream owns verifier tests. The `stage-aosp` text slice in `aosp-pixel10a.test.mjs` is T1, delete. | low |

## Proposed end state
~35 lines: `verifyPixel10aSource`, `listenerSystemuiPatch` re-export and `aospBuildPatch`, typed by upstream declarations; `verify-pixel10a-source.ts` folds into an `aosp-device-check.ts` subcommand (scripts research 2.8).
