# scripts/verify-aosp-secure-camera.ts
- Lines: 15 | Kind: manual CLI (secure-camera source check of an AOSP tree, or read-only image check over adb) | Verdict: MERGE into `scripts/aosp-check.ts secure-camera`
- Covers: `verifySecureCameraSource(path)` or `verifySecureCameraImage(run, user, fingerprint)` from `aosp-secure-camera-contract.ts`. Duplicates: adb boilerplate with `verify-aosp-clock.ts`/`verify-aosp-listener.ts`. Callers: `package.json:26` `aosp:verify-secure-camera` only; no workflow or doc runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | B2 | Dynamic `await import('./toolchain.ts')` only in the device branch, to avoid importing the toolchain for the source branch; `toolchain.ts` has no side effects at import. | Static import. | None |
| 2 | 14 | C6 | Env var `ALPHA_EXPECTED_FINGERPRINT` vs `ALPHA_EXPECTED_IMAGE_FINGERPRINT` in the clock CLI for the same fact. | One `--fingerprint` flag. | Low: anyone with a shell alias must update it. |
| 3 | 9–13 | C3 | adb runner boilerplate. | Shared helper. | None |

## Proposed end state
`aosp-check.ts secure-camera [--aosp-source PATH | --serial S --user U --fingerprint F]`; npm alias `aosp:verify-secure-camera` either removed (research: never called) or repointed.
