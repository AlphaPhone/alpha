# specs/quint/application/FilesFilter.qnt
- Lines: 88 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT/MERGE harness
- Covers: Agent read-only filter on the Files Browse view: old failures cannot erase new rows; cleared/cancelled queries cannot publish. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/files-filter.mjs` (+ `.md`), `test/quint-files-filter.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 26-29 | T10 | Same `  const repaint = () =>` marker injection into upstream files-browser-adapter.ts, exposing filter internals. | Shared fixture as for FilesBrowserController; upstream inspect hook. | Upstream text dependence. |
| 2 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; shared Files fixture; one runner.
