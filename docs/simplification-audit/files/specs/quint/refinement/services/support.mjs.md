# specs/quint/refinement/services/support.mjs
- Lines: 59 | Kind: shared harness helpers | Verdict: KEEP as the consolidation target (MOVE to `specs/quint/refinement/support.mjs`, MERGE twins into it)
- Covers: `deferred` (18 importers), `until` (15), `sourceModule` (10, esbuild bundle of a real product module with specifier stubs), `casStore` (2: `cache.mjs`, `inbox.mjs`), `action` (20), `rootPath` (0). Importers include `application/browser-journal-retention.mjs` and `application/browser-reminder-orphan.mjs` via `../services/support.mjs`, plus `test/quint-source-bundle-capture.test.mjs` and `test/quint-named-embedding-provenance.test.mjs`. Duplicates: `sourceModule` twins in `application/support.mjs:32`, `services/identity-comms-traces.mjs:218`, `services/inbox-workflows-model-traces.mjs:118` and `application/notes-files-media-itf.mjs:70` (`loadProductModule`); `deferred`/`until` twins in `task-scheduler/fixture.mjs:10-23`, `task-scheduler/runtime-fixture.mjs:20-24`, `task-service/index.mjs:7-15` and `legacy/core/source-support.mjs:14`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 59 | A7 | `rootPath` has no importer (repo-wide grep: only its definition). | Delete. | None |
| 2 | 19-43 | C5 | Five `sourceModule`-style bundlers with different option shapes (`stubs`, `{replace, fresh}`, `{stubs, rewrite}`). | One `loadModule(path, {stubs, fresh})` here; callers migrate; the `rewrite` (text mutation) option is not carried (T10). | Medium (stub matching: exact specifier here vs regex in `inbox-workflows-model-traces`) |
| 3 | 30-41 | B5 | `beforeImport` double-build ("discover graph, rebuild, assert identical bytes, call again") exists for input capture; only `google-accounts-lifecycle.mjs:23-24` and the machinery test `test/quint-source-bundle-capture.test.mjs` (T5) use it. | Remove with receipts; delete that test. | Low |
| 4 | 12-18 | C3 | `until` spins `setImmediate` with a 10 s wall deadline; `task-scheduler/fixture.mjs` uses 100 iterations, `task-service/index.mjs` 2000. | One `until(predicate, {label})` here; others import it. | Low |
| 5 | 22 | D13 | `define: {'import.meta.env': '{}'}` papers over renderer env access in Node. | Keep; document once in the merged helper. | – |

## Proposed end state
`specs/quint/refinement/support.mjs` (~40 lines): `deferred`, `until`, `settle`, `action`, `casStore`, one
`loadModule` bundler. Every family imports it; family-local copies and `legacy/core/source-support.mjs` helpers are
removed, which is also a precondition for retiring `specs/quint/legacy` (research §3).
