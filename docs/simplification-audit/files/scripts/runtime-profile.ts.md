# scripts/runtime-profile.ts
- Lines: 20 | Kind: build check (CLI + function) | Verdict: MERGE into `scripts/native-google-host-artifact.ts`
- Covers: the staged native Google host under `android/app/src/main/assets/agent/workflow-worker` equals the built worker artifact. Duplicates: none. Callers: `android/app/product.gradle:129` (`node scripts/runtime-profile.ts --verify-native`), `.github/workflows/resident-android.yml:340`, `scripts/android-build-preflight.ts:199-202`; listed in `scripts/quint-lib.ts:27`; source-text tests `test/android-build-path.test.mjs`, `test/one-runtime-profile.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2, 14, 18 | A8 | Name and output are relics of the removed profiles: returns constant `runtimeProfile:'native'`, CLI message "--verify-cloud is gone". | Move `verifyNativeGoogleHost` into `native-google-host-artifact.ts` with a `--verify-staged` CLI; drop the constant field and the tombstone message. Update product.gradle, resident-android.yml, preflight. | Low (three call sites). |
| 2 | 8 | C3 | Local `json` helper (`readJson` twin). | Use `scripts/lib` `readJson`. | — |

## Proposed end state
File deleted; `node scripts/native-google-host-artifact.ts --verify-staged` is the Gradle/CI check.
