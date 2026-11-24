# test/browser-host-source-closure.test.mjs
- Lines: 40 | Kind: tooling (runs upstream `vendor/eliza/packages/app/scripts/mobile/android/resident-host-sources.mjs` and `scripts/prepare-patched-native.ts` on real files) | Verdict: DELETE
- Covers: the browser host classes are compiled only in the patched native module (`eliza-browser`) and not staged again into app generated sources; staged/patched files match their hashes. Duplicates: `npm run android:build:local` fails with "Duplicate class" if the classes are staged twice, and fails to compile if `RuntimeUpdatePause` is missing; `prepare-patched-native.ts` writes the hashes it is checked against here. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | B5 | Asserts `vendor/eliza` HEAD equals `upstream.lock.json` at module load: an environment check, fails in a dirty submodule rather than testing anything. | Delete. | none |
| 2 | 24, 33, 37 | B5 | Recomputes sha256 of files the tool just hashed (self-validation). | Delete. | none |
| 3 | 27-29 | T1 | Asserts config values in `android/consumer-host.json` (`root:'patchedNative'`, path). A config-equals-config check. | Delete. | none |
| 4 | 26 | — | "no duplicate browser classes" is the only real invariant; Gradle's duplicate-class check enforces it on every Android build. | Rely on the Android build lane. | low |
| 5 | 13, 30 | runtime | Imports a vendor script and runs patching (touches disk; moderate). | Gone. | none |

## Proposed end state
Delete. The Android build (`android:build:local`, both variants) is the evidence. If a fast pre-Gradle guard is wanted, add the duplicate-path check (one line) to `scripts/prepare-patched-native.ts` itself so it fails at prepare time, not in a test.
