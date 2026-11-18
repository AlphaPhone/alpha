# test/native-patch-admission.test.mjs
- Lines: 159 | Kind: tooling (imports `scripts/prepare-patched-native.ts` and `scripts/upstream-native-source.ts`; synthetic manifests in temp dirs; one case symlinks the real `vendor/eliza`) | Verdict: DELETE most; MERGE tests at lines 11-23, 39-47 and 144-156 into `test/tooling/android-build.test.mjs`
- Covers: the native patch engine (descriptor/header/hash/module admission for patches, speech additions, auth descriptors), the production refusal of any patch, the APK receipt check and the companion module byte copy. Duplicates: `test/resident-native-patch-admission.test.mjs` (same engine). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 24-37, 49-140, 157-159 | A4, T3 | Production requires `patches: []` (`prepare-patched-native.ts:74`) and `patches/eliza` does not exist, so every synthetic-patch case tests a path no build can take (see `files/scripts/prepare-patched-native.ts.md` #1). | Delete with the dormant patch engine. | None |
| 2 | 11-23 | - | Production staging refuses a reintroduced patch catalog before writing `.eliza`: a real release rule. | Keep. | None |
| 3 | 39-47 | - | Packaged receipt verification used by `verify-apks.ts`. | Keep. | None |
| 4 | 144-156 | - | Module copy is byte-exact with source hashes: the live path. | Keep. | None |
| 5 | 14 | T8 | Symlinks the real vendor checkout into a temp root. | Keep but note it needs the submodule. | None |

## Proposed end state
Three cases in the android-build tooling file: patch catalog refused, receipt mismatch refused, module copy byte-exact
with hashes. The other ~25 cases go with the patch engine.
