# specs/quint/application/FilesPreview.qnt
- Lines: 34 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP (upstream follow-up)
- Covers: Per-volume Files preview ownership: no stale publication, release after settlement, returned view rejects old preview. Duplicates: None. Callers/importers: `specs/quint/refinement/application/files-preview.mjs` (via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`) only), files-browser-coordinator.md.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest sources | P6 | All sources are `vendor/eliza/plugins/plugin-files/...` plus `upstream.lock.json` and `scripts/prepare-client-features.ts`: a model of upstream-only code. | Keep for now (cheap, import-based); propose moving model + harness upstream (D14 follow-up). | — |
| 2 | harness | — | Uses `bundledSource` (import). | None. | — |
| 3 | runner | — | Only the aggregate runs it. | Add a per-model runner when aggregates go, or move upstream. | Coverage loss if forgotten. |

## Proposed end state
Unchanged until upstream takes it.
