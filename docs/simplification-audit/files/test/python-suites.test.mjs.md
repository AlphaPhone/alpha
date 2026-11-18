# test/python-suites.test.mjs
- Lines: 29 | Kind: tooling runner (spawns 5 Python unittest files with `python3 -I`) | Verdict: KEEP as the single Python collector (rename `test/tooling/python.test.mjs`); remove the ABI line; absorb the other single-file Python wrappers
- Covers: recovery UI guard, pending recovery phases, resident crash diagnostic, Android ABI selection, emulator microphone preflight (Python tools behind CI and release steps). Duplicates: `resident-crash-diagnostic.test.py` also runs in `.github/workflows/resident-android.yml` (research P11). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28 | T2 | Runs `android-app-abi-selection.test.py`, which chunk test-01 deletes (Groovy slice transplant). | Remove the line with that delete. | Low |
| 2 | 27 | T4/P3 | `resident-crash-diagnostic.test.py` runs here and in `resident-android.yml:245`. | Run it once (here); drop the workflow step, or vice versa. | Low |
| 3 | all | T9/P11 | Separate one-file wrappers exist for other Python suites (`qualified-app-update.test.mjs:7-9`, `packaged-runtime`, `aosp-apk-preparation`, `cloud-signing-input`, `resident-crash-diagnostics`). | Fold them into this collector, one `test()` per suite; delete the wrappers. | Low |
| 4 | 19 | T9 | `runCi` puts `scripts/ci` on `sys.path` because two suites live in `scripts/ci/test-*.py`. | Move those suites to `test/` (chunk decisions elsewhere) and drop `runCi`. | Low |
| 5 | 21-23 | keep | Skips are honest (missing Gradle Groovy jar, missing grpc). | Keep. | Low |

## Proposed end state
`test/tooling/python.test.mjs`: one `test()` per Python suite that gates CI or release, all under `test/`, each run once.
