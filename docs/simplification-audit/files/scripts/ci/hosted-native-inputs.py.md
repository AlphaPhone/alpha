# scripts/ci/hosted-native-inputs.py
- Lines: 210 | Kind: CI script (native-input admission/download) | Verdict: KEEP, SIMPLIFY
- Covers: `--check` validates `android/hosted-native-inputs.json` against `app.config.json`, `upstream.lock.json` and the voice/embedding host records; `--acquire` downloads three pinned GitHub artifacts, verifies them member-by-member and writes `test-results/resident-ci-native-inputs/{voice,embedding,qualification,admission.json}`. Duplicates: artifact download/extract is delegated to `embedding-artifacts.py` (good). Callers/importers: `.github/workflows/resident-android.yml:113` (`--check`), `:234` (`--acquire` under `resident-phase.py`); output consumed at `:238-239,394` and by `scripts/app-update-candidate.ts:46`, `scripts/source-snapshot.ts:27`; README.md:153-189; test `test/hosted-native-inputs.test.py` (run at `resident-android.yml:198`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-31 | C7 / scripts 2.10 | Loads the hyphenated `embedding-artifacts.py` with `importlib.util.spec_from_file_location`. | Rename the Python CI modules to underscore names (`embedding_artifacts.py`) and `import` them; one change across the 9 loaders. | Low; workflow paths and Quint/manifest pins that name the file must be updated together. |
| 2 | 24-26, 34-35 | C3 | `SHA256`/`COMMIT`/`ID` regexes and `matches()` are re-declared in ~6 Python CI files (`qualified-app-update.py:24-26`, `sign-os-ota.py:18`, `private-apk-storage.py:25,28`). | One `scripts/ci/ci_common.py` (`require`, `HEX`, `COMMIT`, `sha256_file`, `strict_json`). | Low. |
| 3 | 141-145 | B5 | `acquire` re-hashes the three committed records via `git show HEAD:` after `load_plan` already read and hashed the same working-tree files, and after asserting `HEAD == GITHUB_SHA`. In a fresh checkout these cannot differ. | Drop the `git show` loop; keep the `HEAD == GITHUB_SHA` check. | Low. |
| 4 | 71-101 | B3 | `load_plan` re-validates committed, reviewed JSON (key sets, regexes, `9007199254740991` bound) on every run. The cross-record equalities (package, SDK pin, record digests, shared `libc++`/engine bytes) are the real check; the shape checks guard our own files. | Keep the cross-record equalities; drop per-field shape checks of committed files. | Low; a malformed record still fails on `KeyError`. |
| 5 | 156-159 | — | ZIP-overhead bound arithmetic is correct and commented; keep. | None. | — |

## Proposed end state
- Same two modes, same output folder and `admission.json` schema (consumed by `app-update-candidate.ts` and the distribution archive).
- Imports `embedding_artifacts` and `ci_common` normally; ~150 lines.
- Shape validation only for downloaded bytes (the trust boundary), not for committed records.
- `test/hosted-native-inputs.test.py` stays the one test (runs in resident-android, where the script runs).
