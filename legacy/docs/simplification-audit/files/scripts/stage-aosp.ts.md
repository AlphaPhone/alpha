# scripts/stage-aosp.ts
- Lines: 358 | Kind: OS-image staging CLI (npm `aosp:stage`) | Verdict: KEEP, SIMPLIFY
- Covers: stages the launcher (and optional development listener) into an AOSP vendor overlay for Cuttlefish or Pixel 10a, with production refusals (product lock, reviewed descriptor, release-signed APK, platform cert, P-78 listener refusal). Duplicates: none. Callers: `package.json` `aosp:stage`; referenced by `android/aosp/*.json` descriptions, `AlphaImageCapability.java`, launcher manifest comment, `verify-pixel10a-image.ts`; listed in `quint-lib.ts:31`; tests `aosp-cuttlefish.test.mjs` (imports `reviewedSourceOverrides`, `stagingSystemuiPatches`), `aosp-capabilities.test.mjs:53` and `aosp-image-capability.test.mjs:62` (T1: `indexOf` on this file's text), `aosp-pixel10a.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 169-356 | D8 / D9 | `main` is a 190-line unindented body; `get()` re-scans argv; a 450-char usage string. | `node:util` `parseArgs` (`multiple` for the two patch flags); split into `parseOptions`, `admitInputs` (APK, descriptor, listener), `stageOverlay` (temporary dir, overlay writers, rename). | Medium (production refusal order must be preserved; refusals happen before any output, keep that). |
| 2 | 121-133 | C5 | `stagingSystemuiPatches` and `stagingBuildPatches` are the same function with a different mapper and message. | One `stagingPatches(kind, names, imageTarget)`. | Low |
| 3 | 110-119 | D4 | `reviewedSourceOverrides` only renames `cuttlefish`→`imageTarget` and casts the upstream function. | Call upstream directly with `imageTarget`; add a `.d.ts` for the `.mjs` modules instead of `as unknown as` casts (70-72, 87-94, 111-117). | Low |
| 4 | 75 | D8 | `import` statement in the middle of the file. | Move to the top. | — |
| 5 | 54 | C3 | Local `message(error)` helper (also in `sign-release-apks.ts:88`). | Shared `errorText` in `scripts/lib`. | — |
| 6 | 154, 162, 236 | C3 | Three inline sha256 computations. | Shared sha256 helper. | — |
| 7 | 246-248, 287-291 | B3 | Descriptor package/module checked twice (before and after the development descriptor is written). | Check once on the final `reviewed` descriptor. | Low |
| 8 | — | T1 | Two tests slice this file's text to assert call order (`aosp-capabilities.test.mjs:53`, `aosp-image-capability.test.mjs:62`). | Delete those assertions; the behaviour (capability overlay only for non-Pixel production) is checked by running `main` on a fixture in `aosp-pixel10a.test.mjs`-style integration. | Low |

## Proposed end state
~260 lines with a typed options object, three phase functions and no duplicated patch/descriptor
checks. One integration test stages a fixture APK for development and production refusals; no text pins.
