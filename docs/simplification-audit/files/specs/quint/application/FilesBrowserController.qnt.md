# specs/quint/application/FilesBrowserController.qnt
- Lines: 78 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT/MERGE harness
- Covers: Installed Files folder-read coordinator: stale grants/denials and retired listings or agent reads cannot publish or share. Duplicates: FilesFilter and FilesPreview harnesses bundle the same upstream adapter with the same seam. Callers/importers: `specs/quint/refinement/application/files-browser-coordinator.mjs` (+ `.md`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`); no per-model wrapper), referenced by files-preview.mjs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 20-26 | T10 | esbuild onLoad injects `__ports.inspect=…` before marker `  const repaint = () =>` in upstream `files-browser-adapter.ts` (asserted unique). | Ask upstream for an inspect/observer export (D14) or observe via ports; share one fixture with FilesFilter. | Upstream text dependence. |
| 2 | harnesses | C5 | files-browser-coordinator.mjs and files-filter.mjs carry near-identical bundling plugins on the same marker. | One `files-browser-fixture.mjs`. | Low. |
| 3 | manifest sources | P6 | Code is upstream plugin-files; product part is `selection-adapter.ts`. | Upstream follow-up. | — |

## Proposed end state
Model unchanged; one shared Files fixture; per-model runner.
