# test/archive-scan.test.mjs
- Lines: 51 | Kind: tooling (spawns Python `scripts/scan-archived-apks.py` with a monkey-patched `Path.home`) | Verdict: DELETE (with `scripts/scan-archived-apks.py`; owner question)
- Covers: the archive scanner accepts release APK names, rejects a release DEX that carries an androidTest class, and stops plainly with no local provider key. Duplicates: androidTest/debug-hook exclusion is enforced by `scripts/verify-apks.ts` (tested by `test/verify-apks.test.mjs`) and `scripts/audit-production-bundle.ts`. Callers/importers: `npm test` only. The script it tests has no caller other than this test (grep of `.github`, `scripts`, `package.json`: none; see `files/scripts/scan-archived-apks.py.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7, T5 | Tests a tool nothing runs; CI cannot run the tool for real (it needs `~/.config/alphaphone/cerebras-key`). | Delete with the script. | Low |
| 2 | 27, 45 | C3 | The Python runner string is pasted twice. | Gone with the file. | — |
| 3 | 10-11, 38-39 | — | Writes into `test-results/` in the repo, not `os.tmpdir()`. | Gone with the file. | — |
| 4 | 19-24 | — | Requires the `zip` binary and `python3`; the only Python dependency in this chunk. | Gone with the file. | — |

## Proposed end state
File and `scripts/scan-archived-apks.py` deleted. If the owner wants a "provider key not in any APK byte" check, it becomes an optional `--secret-file` input of `verify-apks.ts`, tested in `test/verify-apks.test.mjs`.
