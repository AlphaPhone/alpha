# scripts/aosp-secure-camera-contract.ts
- Lines: 38 | Kind: script helper (Alpha binding of upstream `secure-camera.mjs`, policy P-23) | Verdict: KEEP, SIMPLIFY
- Covers: supplies Alpha's package and brand to the shared secure-camera image check and the lock-screen-surface manifest check; re-exports seven upstream symbols. Duplicates: none. Callers/importers: `scripts/stage-aosp.ts:12` (`verifySecureCameraSource`, `writeSecureCameraOverlay`, `assertNoAlphaLockScreenSurface`), `scripts/verify-aosp-secure-camera.ts:3` (`verifySecureCameraImage`, `verifySecureCameraSource`); tests `aosp-secure-camera-policy.test.mjs` (`secureCameraActions`), `aosp-secure-camera.test.mjs`, `aosp-staging-patches.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-21 | A7 | `SECURE_CAMERA_CONTRACT`, `loadSecureCameraContract`, `secureCameraComponent`, `secureCameraPackage` re-exported with no importer (git grep); `secureCameraActions` only by a test. | Re-export only what scripts use; tests import upstream directly. | None |
| 2 | 23 | C3 | Reads `app.config.json` at import for `appId`; several other AOSP helpers read it too. | Shared `readAppConfig()`. | None |
| 3 | 27-29 | D14 | Cast to widen upstream's type. | Upstream follow-up. | None |

## Proposed end state
~25 lines: two Alpha-bound functions and the two re-exports `stage-aosp.ts`/`verify-aosp-secure-camera.ts` need. `verify-aosp-secure-camera.ts` becomes a subcommand of `aosp-tools.ts`.
