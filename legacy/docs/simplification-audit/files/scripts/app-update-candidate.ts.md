# scripts/app-update-candidate.ts
- Lines: 312 | Kind: CI release tool (unsigned main-push candidate version admission + receipt + archive-size record) | Verdict: KEEP + SIMPLIFY
- Covers: picks a monotonically increasing `versionCode` from the workflow run number above every published/retained floor, and binds the unsigned candidate APKs to the frozen build inputs and native-input admission. Duplicates: `UpdateOffer` twin in `deliver-app-update.ts:17`; `gh` wrapper twin `deliver-app-update.ts:91`; `readJson`/`hash` local copies (C3, research 2.3). Callers/importers: workflow `.github/workflows/resident-android.yml` (three modes); test `test/app-update-candidate.test.mjs` (+ `test/fixtures/app-update-candidate.mjs`); Quint refinement `specs/quint/refinement/services/app-update-candidate.mjs:17` and `protected-app-update-promotion.mjs:202` (hash this file as input); `specs/quint/services/manifest.json:2875,2928` (path pins).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-54, 69, 78-84 | C3 | Private `hash`, `readJson`, `git`, `gh` helpers; the same four exist in `deliver-app-update.ts` and ~15 other scripts. | Use `scripts/lib/{hash,fs,git,gh}.ts`. | Low; file is a refinement hash input (receipts refresh once). |
| 2 | 116-146 | A1 (owner) | Loop reads both `LEGACY_APP_UPDATE_TAG` (`app-stable`, `update-channel.ts:11`) and the current tag to compute the version floor. This is a *published release* floor, not app data: dropping it could reuse a versionCode below one already on a phone. | Keep (same reasoning as D17). Ask the owner whether `app-stable` still holds assets; if it was emptied, delete the tag and `deliver-app-update.ts:113-132 checkLegacyFloor` together. | High if wrong - real update floor. |
| 3 | 183-206 | B3 | `candidateReceipt` re-validates `native-input-admission.json` fields (hex regexes, safe integers, positive sizes) that `scripts/ci/hosted-native-inputs.py` wrote in the same workflow run and that are already hash-bound in the build freeze (line 182). | Keep the hash binding (`before.files[...] === native.sha256`) and the source/sdk/run identity equality; drop the per-field shape regexes. | Low. |
| 4 | 220-224 | B5 | Double `lstat` around hashing to detect the APK changing during hashing. Threat is a concurrent writer in the same CI job. | Drop the before/after stat comparison; keep regular-file check and digest equality with the verification row. | Low. |
| 5 | 262-268 | B3 | `ALPHA_CANDIDATE_ARTIFACT_ID/SHA256` regex-validated, then GitHub metadata compared field by field. The comparison is the real check. | Keep the metadata comparison; the regexes are redundant with it. | None. |
| 6 | 289-307 | D9 | `main` hand-parses three modes positionally; `receipt` mode re-runs `candidateVersion` and merges fields. | `node:util parseArgs` with a subcommand; otherwise fine. | None. |
| 7 | 21 | C1 | `UpdateOffer` declared here and in `deliver-app-update.ts:17`. | Export from `update-channel.ts`. | None. |
| 8 | whole | T10 | Path- and hash-pinned by two Quint refinement harnesses and the services manifest. | Harnesses already import the module (good); remove the source-hash input list when harnesses stop hashing scripts. | Cross-file. |

## Proposed end state
~240 lines: `candidateVersion`, `candidateReceipt`, `candidateArchiveSize` and a small `main`, using shared
`scripts/lib` helpers and the shared `UpdateOffer` type; trust-boundary checks kept (GitHub API responses,
public pointer bytes, workflow identity), same-run self-revalidation removed. The legacy `app-stable` floor stays
until the owner confirms that tag is retired. `test/app-update-candidate.test.mjs` is an integration test of this
CLI (fake `gh`, real files) and stays as the coverage.
