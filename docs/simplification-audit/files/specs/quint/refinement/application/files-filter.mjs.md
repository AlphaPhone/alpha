# specs/quint/refinement/application/files-filter.mjs
- Lines: 224 | Kind: Quint refinement harness; esbuild bundle of upstream `files-browser-adapter.ts` with one closure-observer seam | Verdict: MERGE into `specs/quint/refinement/application/files-browser.mjs`
- Covers: agent `files_filter` runs: newer filter wins over late success/rejection, same text with a new identity fences the old one, clear by chip/Back, denial/unavailable/abort, reload during admission or query, no storage writes. Duplicates: run by `test/quint-files-filter.test.mjs` and the aggregate `index.mjs:71` (T4); scaffolding duplicates `files-browser-coordinator.mjs` (C5). Callers/importers: those two.
- Model: `FilesFilter.qnt`, live (sources `prototype/selection-adapter.ts` + prepared upstream Files files + upstream lock). Code actually executed is upstream only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-30 | T10 | Same `'  const repaint = () =>'` seam as the controller harness, exposing seven closure variables. | Shared `compileFilesAdapter` in the merged file; upstream inspection hook as D14 follow-up. | Med |
| 2 | 37-160 | C5 | Fixture boot duplicates the controller harness. `AsyncLocalStorage` to attribute storage calls to operations is a nice touch worth keeping. | Merge. | Low |
| 3 | 210-224 | T3 | `checkRetiredFilesFilterReload` is a single non-model regression (leave during reload preserves rows), asserted by the test file. | Express as an 18th schedule (`reload`, `leave`, stale `queryReply(0)`) if the model allows it; otherwise keep it as one extra check in the merged file. | Low |
| 4 | 115-117 | – | Parses the success count from the agent result text `Showing N items in Files.`; couples to upstream copy. | Acceptable (it is the agent-visible contract). | Low |
| 5 | 23-24 | P6 | Upstream-only code path. | Lane-gate on `upstream.lock.json`. | Low |

## Proposed end state
Schedules table and observation projection move unchanged into `files-browser.mjs` as `checkFilesFilter`; the retired-reload
regression becomes a schedule or one extra assertion. One test file for the three Files checks.
