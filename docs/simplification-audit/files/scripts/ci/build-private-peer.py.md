# scripts/ci/build-private-peer.py
- Lines: 33 | Kind: CI script (builds the debug-only ordinary-UID peer fixture APK and records it in the resident archive) | Verdict: KEEP, SIMPLIFY (format + drop evidence ceremony)
- Covers: assembles `android/private-peer-fixture` (a socket probe used by resident CI to prove an ordinary app cannot reach the private agent socket), checks package identity/debuggable/no INTERNET/no launcher, checks it shares the signer of the developer APKs, and adds it to `apk-manifest.json`. Duplicates: none functionally. Callers/importers: `.github/workflows/resident-android.yml:413`; listed in `scripts/ci/resident_fixture.py:26,29` (expected helper sources); `android/private-peer-fixture/build.gradle:2` comment; `test/resident-native-ci-admission.test.mjs` (text reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-33 | D8 | Statement soup: semicolon-joined statements, one-letter lambda `h`, module-level code with no `main()`. | Reformat into `main()` with named steps. | Low. |
| 2 | 7-10, 15, 30 | B5 | Hashes its own sources and the fixture sources before and after the Gradle build ("Helper sources changed during build") and stores them in `private-peer-manifest.json`; `resident_fixture.py` then re-checks that set. Git checkout + Gradle verification metadata already pin the bytes. | Drop before/after hashing; keep APK sha256 + signer in the manifest if `resident_fixture.py` consumes them. | Low. |
| 3 | 32 | B5 | `assert len(manifest)==6` exact-count assertion on a file another step wrote. | Assert the two names being added are absent instead. | Low. |
| 4 | 18, 23 | C6 | `build-tools/36.0.0` literal (also in `build-app-signing-fixtures.py`). | Shared constant. | Low. |
| 5 | 6 | C3 | Local `sha256` lambda; one of ~40 SHA-256 helpers in `scripts`. | `scripts/ci/cilib.py`. | Low. |

## Proposed end state
~25 readable lines in `main()`: run `android-host.ts`, assemble, copy, check badging + signer, append to `apk-manifest.json`. No self-hashing.
