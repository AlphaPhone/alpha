# android/embedding-host/build-toolchain.json
- Lines: 7 | Role: pinned NDK, CMake and engine repository for rebuilding the reviewed ARM64 embedding host. | Verdict: SIMPLIFY
- Importers: `scripts/build-embedding-host.ts:17,183` (`BUILD_TOOLCHAIN`, reads `ndk`, `cmake`, `engineRepository`), `scripts/android-build-preflight.ts:260` (passes it to `embeddingHostState`, which ignores it: `_toolchain`). Text/path pins: `test/upstream-pin-guard.test.mjs:104` (copies the file), `test/strict-build-inputs.test.mjs:17,26,70,163` (fixture writes `remapBuildPath`, `remapBuildPathEvidence`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | A7 | `"remapBuildPath": true` is never read: `scripts/build-embedding-host.ts:187,207` hard-code `{remap: true}`; the `Toolchain` type (line 21) also declares `remapBuildPathEvidence`, which this file does not contain. | Delete the field here and both members from the `Toolchain` type; drop the fixture parameter in `test/strict-build-inputs.test.mjs`. | Low |
| 2 | 2 | A7 | `"schema": 1` has no reader (grep `schema` in the reading scripts: 0). | Delete. | Low |
| 3 | — | A7 (cross-file) | `embeddingHostState(_manifest, _toolchain, staged)` (`build-embedding-host.ts:88`) ignores both record arguments, so the preflight reads this file for nothing. | Drop the parameters and the `readJson(BUILD_TOOLCHAIN)` in `android-build-preflight.ts:260`. | Low |

## Proposed end state
5 lines: `ndk`, `cmake`, `engineRepository`.

## Verification
`node --test test/strict-build-inputs.test.mjs test/upstream-pin-guard.test.mjs test/android-build-path.test.mjs`; `npm run agent:build-embedding-host` (rebuild reproduces reviewed bytes).
