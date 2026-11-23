# scripts/ci/resident_fixture.py
- Lines: 50 | Kind: CI library (admit the frozen resident archive) | Verdict: KEEP, SIMPLIFY (absorb `resident_native_source.py`)
- Covers: checks the archive manifest digest, every APK digest, the private-peer helper's source list/signer/badging, apksigner certificates of all test APKs, that `inputs-before.json == inputs-after.json`, the upstream pin, and generated native source provenance; returns `(manifest, frozen, lock)`. Duplicates: `apk-manifest.json` parsed independently by ~30 scripts (research 2.10). Callers/importers: `pending-recovery-ui.py:6`, `resident-native.py:7`; `test/resident-native-ci-admission.test.mjs` (source-text; `test/aosp-native-fixtures.py` only has a same-named method, not an import).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 46 | D4 | Only importer of `resident_native_source.verify_generated_native` (32 lines). | Inline it here. | None. |
| 2 | 47-49 | B5 | Re-hashes every frozen `androidTest`/`testMocks`/`main/java` file in the checkout against `inputs-before.json`; the archive was built from this same checkout and SHA in the same workflow run. | Keep only if the archive can come from another run (artifact download across jobs: it can, `native`/`recovery-ui` jobs download it); then this proves the job's checkout matches. Keep, but comment why. | Low. |
| 3 | 32 | — | Hard-coded `build-tools/36.0.0`. | Constant shared with workflow setup. | None. |

## Proposed end state
One `resident_fixture.py` (~70 lines) including native source provenance, without the script self-hash (see `resident_native_source.py` report).
