# scripts/agent-bundle-dependencies.ts
- Lines: 38 | Kind: build script helper (resident bundle dependency inventory) | Verdict: KEEP
- Covers: writes and re-verifies `agent-bundle-dependencies.json` (packages the Android agent bundle contains) from the upstream mobile manifest, for licences and SBOM. Duplicates: none. Callers/importers: `scripts/stage-local-agent-runtime.ts`, `scripts/generate-licenses.ts`; listed in `scripts/quint-lib.ts` `runtimeScriptPaths`; tests `test/runtime-licenses.test.mjs`, `test/sbom.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-19 | B1 | try/catch only re-wraps any error with a prefix (cause kept). | Acceptable; or drop the wrapper and let the specific messages surface. | None |
| 2 | 30-31 | B3 | Re-checks that the upstream manifest names `agent-bundle.js`/`android`; the file is produced by the pinned upstream build in the same pipeline. | Keep (cheap guard at a cross-repo boundary). | None |
| 3 | — | 2.4 | Hand-listed in `quint-lib.ts` `runtimeScriptPaths`. | Drop from that list when the list is derived (scripts research §2.4). | Low |

## Proposed end state
Unchanged apart from moving into `scripts/build/` with the rest of the staging pipeline. Coverage stays with the licence/SBOM integration tests.
