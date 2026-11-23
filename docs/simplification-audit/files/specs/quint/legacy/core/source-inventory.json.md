# specs/quint/legacy/core/source-inventory.json
- Lines: 2239 | Kind: Quint historical-source inventory (data: upstream TLA+/TLC paths, sha256, variables/definitions per model, 8 `historicalArtifacts`, a `currentUpstream` block listing upstream Quint sidecars) | Verdict: DELETE (after two live harnesses drop their read of it)
- Covers: pins revision `4787d51a14…` of `vendor/eliza` and the sha256 of 16 upstream `packages/core/tla/*.tla` modules + 31 `.cfg` files that the 16 `legacy/Core*.qnt` were translated from, plus 8 historical runtime fragments (`embeddings.ts`, `embedding-vector-space.ts`, plugin-sql `base.ts`/`embedding-space.ts`/`pglite/adapter.ts`, `services/approval.ts`, `tla-graph.ts`, `InteractiveTask.reducer.graph.json`). `currentUpstream` (rev `8876e369…`) records that current upstream has **no** TLA at all and lists upstream-owned Quint sidecars (DeletionOwnerAdmission, CloudSpeechSuccessor, MapsTileCache, ViewportCopyright, …) as bytes only, with no consumer of that block. Duplicates: the `models[]` list restates `specs/quint/legacy/manifest.json` entries; `currentUpstream` restates `upstream.lock.json` + vendor content. Callers/importers (whole-repo `git grep source-inventory`):
  - `specs/quint/legacy/core/formal-source-inventory.mjs:39` (`materializeHistoricalFormalSources`), which is called by `legacy/core/source-support.mjs:10` (`bundleVendorCore`, used by live `refinement/services/current-approval-service.mjs`), `refinement/services/core-runtime/module.mjs:49`, `refinement/services/task-service/module.mjs:51`, legacy `check-interactive-task-refinement.mjs:30`.
  - `scripts/prepare-quint-history.ts:8` (`quintHistoryInventories`: this revision is fetched over the network per verify, P6).
  - `specs/quint/legacy/core/check-configurations.mjs:9`, `check-interactive-task-traces.mjs:13`, `specs/quint/legacy/manifest.json:1898`, `test/quint-tla-inventory.test.mjs:12` (T5: tests the inventory itself), `legacy/core/README.md:6`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6 | Historical evidence about upstream TLA+ that the current pin does not contain (`currentUpstream.note`: "no tracked TLA modules"). Forces `quint:prepare-history` to fetch an old upstream commit. | Delete with `legacy/` (D11 retirement). | Low; models of code no longer shipped. |
| 2 | 1-60 per model | B5 / T10 | Lists every TLA `variables`/`definitions`/`features` name per model: a text inventory nothing executes except the inventory test (`test/quint-tla-inventory.test.mjs`). | Delete with that test. | None. |
| 3 | `currentUpstream` | B5 / A7 | Sidecar sha256 + git objects for upstream Quint files; no reader (only the note documents them). Not a coverage claim. | Delete. | None. |
| 4 | (live link) | P6 | Live harnesses `services/core-runtime/module.mjs:49` and `services/task-service/module.mjs:51` call `materializeHistoricalFormalSources(root, extraSources)`; with no vendor paths in `extraSources` it maps nothing and only adds this JSON + `formal-source-inventory.mjs` to the hashed input list. `bundleVendorCore` (live via `current-approval-service.mjs`) does the same. So the live dependency is "the file must exist", not behaviour. | Before deletion: remove those `materializeHistoricalFormalSources` calls (use `extraSources` directly) and port `bundleVendorCore` out of legacy (see `source-support.mjs` report). | Low; check `test/quint-core-approval-service.test.mjs:8` which asserts `historicalRevision === '4787d51a…'` and must drop that assertion. |
| 5 | (cross) | — | `refinement/native/{mms,sms}-dispatch.mjs` use `materializeHistoricalSources` with their **own** inventory (`mms-historical-sources.json`), not this file. | Not affected by this deletion; that inventory is a separate owner decision (ci-and-formal §3). | — |

## Proposed end state
File deleted together with `specs/quint/legacy/**`, `test/quint-tla-inventory.test.mjs`, and its entry in
`scripts/prepare-quint-history.ts:8` (the script itself goes if `mms-historical-sources.json` is also retired).
Prerequisites: live `services/core-runtime/module.mjs` and `services/task-service/module.mjs` stop calling
`materializeHistoricalFormalSources`; `bundleVendorCore`/`deferred`/`tick` move to `specs/quint/refinement/support.mjs`
without the historical-runtime branch; `test/quint-core-approval-service.test.mjs` drops its historical-revision assertion.
No live model loses coverage.
