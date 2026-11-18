# test/resident-crash-diagnostic.test.py
- Lines: 93 | Kind: tooling (Python unittest of `scripts/ci/resident_crash_diagnostic.py`; fake `adb`; AST slice of `scripts/ci/resident-native.py`) | Verdict: DELETE
- Covers: CI crash-buffer projection for a seccomp-killed resident worker: exact attribution, refusals, bounded reads, SIGTERM cleanup. Duplicates: run twice, by `test/python-suites.test.mjs:27` and `.github/workflows/resident-android.yml:245` (P3). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-93 | T5/B5 | Tests an optional diagnostic of a CI lane (`resident-android.yml`, 0 green runs in 40 per research) that gates no release. | Delete; delete the two invocations. | Low |
| 2 | 55-92 | T2 | Executes an `ast`-extracted `if` block of `resident-native.py` chosen by matching unparsed source text. | Delete. | Low |
| 3 | 23-27 | T8 | Wall-clock bounds (`sleep(5)`, `<seconds+1.2`) are timing-sensitive on CI. | Goes with the file. | Low |

## Proposed end state
File deleted; remove line 27 of `test/python-suites.test.mjs` and line 245 of `resident-android.yml`. Owner question:
whether `scripts/ci/resident_crash_diagnostic.py` itself is still wanted (its only consumer is `resident-native.py`).
