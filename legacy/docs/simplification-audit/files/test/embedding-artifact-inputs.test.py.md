# test/embedding-artifact-inputs.test.py
- Lines: 221 | Kind: tooling unit tests (Python `unittest` importing `scripts/ci/embedding-artifacts.py`; fake URL opener, temp zips) | Verdict: KEEP (trimmed), register in `test/tooling/python.test.mjs`
- Covers: the CI admission of compiled embedding libraries and their semantic qualification: GitHub artifact metadata pinned to this repository, TLS-only non-local redirects with credentials stripped after the API hop, byte/digest match, zip traversal/duplicate/symlink refusal, exact receipt inventories, finite semantics, carrier schema/hash binding. Duplicates: none. Callers/importers: `.github/workflows/resident-android.yml:197` runs it directly; not in `test/python-suites.test.mjs` (its header says so). This gates the signed release input, so it is tooling that gates a release (T5 exception).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-44 | A4/A7 | Four tests of `settings()` (opt-in `ALPHA_LOCAL_EMBEDDINGS` path). `files/scripts/ci/embedding-artifacts.py.md` says the single runtime profile retired that path. | Delete with the function. | Low. |
| 2 | 39-42 | A8 | "One runtime profile" tombstone test. | Delete. | None. |
| 3 | 46-218 | - | Download/redirect/zip/receipt/carrier validation: security-relevant supply-chain checks, real module, only fakes at the network edge. | Keep. | - |
| 4 | 128 | B5 | Asserts exactly 14 producer inputs: an exact-count pin that changes with every upstream producer change. | Assert equality with `qualified-host.json` count instead. | Low. |
| 5 | whole | P3, C7 | Run only by one workflow job, outside the shared Python runner; a second home for Python tests. | Register in the single Python runner; workflow calls the runner lane. | None. |

## Proposed end state
About 13 tests in the same file, invoked by `test/tooling/python.test.mjs` (one runner for all Python suites), run on
changes to `scripts/ci/embedding-artifacts.py`, `android/embedding-host/**` or the workflow.
