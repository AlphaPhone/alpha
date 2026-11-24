# test/android-dependency-fingerprint.test.mjs
- Lines: 62 | Kind: tooling integration (real `androidDependencyFingerprint` and `parseGradleTree` from `scripts/generate-licenses.ts`, real `preparePatchedNative` on a temp checkout with a git-initialised `vendor/eliza`) | Verdict: KEEP; MERGE into `test/tooling/release-licenses.test.mjs` (or `android-build.test.mjs` if no licenses file is formed)
- Covers: the recorded Android classpath fingerprint changes when a packaged module's Gradle dependencies change (including transitive native-only modules) and ignores fixture modules; an unresolved Gradle row is refused. This guards the third-party notices shipped in the APK. Duplicates: none found. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-56 | - | Real fingerprint over real staging: release licence provenance. | Keep. | Medium if dropped |
| 2 | 58-62 | T3 | Parser unit case. | Keep as one assertion (cheap, protects a fail-closed rule). | - |
| 3 | 14-27 | C3 | Another temp-checkout-with-pinned-vendor fixture (same shape as `android-build-path` `fixture`). | Share one helper. | - |

## Proposed end state
Unchanged cases, moved beside the other licence/packaging tooling tests and using the shared checkout fixture. When
`generate-licenses.ts` is split by source (scripts research), the import path follows.
