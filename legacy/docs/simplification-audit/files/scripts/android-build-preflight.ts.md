# scripts/android-build-preflight.ts
- Lines: 336 | Kind: script (build input check before Gradle; `--report` lists strict-build inputs) | Verdict: KEEP, SIMPLIFY
- Covers: fails fast when the pinned checkout, voice outputs, embedding host, prepared runtime, staged payload or Google host are missing or stale, and reports who supplies each input. Duplicates: Gradle tasks `:app:verifyVoiceHost`/`verifyEmbeddingHost`/`verifyNativeGoogleHost` check the same things later (this is the early, readable version; keep). Callers/importers: npm `android:build:inputs`, `android:build:local`; `scripts/build-android.ts`, `gradle-verification.ts`; listed in `quint-lib.ts`, `source-snapshot.ts`; Quint `specs/quint/refinement/services/android-build-input-readiness.mjs` imports its functions (good: real import); tests `android-build-path.test.mjs`, `mobile-uuid-build.test.mjs`, `one-runtime-profile.test.mjs`, `strict-build-inputs.test.mjs`, `upstream-pin-guard.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22, 307 | A8 | `refuseRemovedProfileFlags(args)` tombstone; the strict option list at 308-309 already rejects unknown flags. | Delete the call (and `removed-profile-flags.ts`). | None |
| 2 | 182-188 | A1/A8 | Refuses a payload "staged for the removed Cloud profile" via `alpha-runtime-profile.json`. After the package rename no such payload can exist in a fresh checkout. | The marker is written by `stage-local-agent-runtime.ts:71` and read only by scripts (`stage-aosp-native.py:69`, `verify-packaged-runtime.py:106`, here); `git grep` finds no reader in `apps/` or `android/`. Delete the marker and its three checks together. | Low (packaged asset list changes once). |
| 3 | 59-65, 70, 133, 230, 241 | C3 | `readHead` and `git` are two git wrappers in one file; `upstream.lock.json` is read three times; local `readJson`. | Use `scripts/lib/git.ts`, `pin.ts`, `fs.ts`. | Low |
| 4 | 200-206 | D4 | Spawns `scripts/runtime-profile.ts --verify-native` and regex-parses its stderr. | Import the verifier function (runtime-profile research proposes merging it into `native-google-host-artifact.ts`). | Low |
| 5 | 67, 81-87 | B1 | Tries two spellings of `origin/main` with empty catches. | Keep one (`refs/remotes/origin/main`); `git show` resolves both forms anyway. | Low |
| 6 | 290 | — | The release-signer action string names a person and issue numbers. | Keep a role ("release owner") and link the runbook. | None |
| 7 | 30-57 | C1 | Five option interfaces for internal functions. | Collapse into one `PreflightOptions`. | None |

## Tests
`strict-build-inputs.test.mjs` and the Quint readiness model cover the report and problem lists. `one-runtime-profile.test.mjs` and the removed-flag cases in `android-build-path.test.mjs`/`upstream-pin-guard.test.mjs` test the tombstone: delete those cases.

## Proposed end state
~280 lines: one git helper, one pin read, no tombstone, Google-host check by import. Same CLI and exit codes.
