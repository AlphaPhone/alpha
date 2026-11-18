# scripts/fixtures/local-agent-stream.ts
- Lines: 19 | Kind: test support (esbuild-bundles `apps/app/src/runtime/local-agent-stream.ts` and imports it) | Verdict: MERGE into `test/support/bundle-module.ts` (see `bundled-module.ts`)
- Covers: loads the real local-agent stream parser in Node. Duplicates: `scripts/fixtures/bundled-module.ts:4-26` (same mechanism). Callers/importers: `scripts/test-batch-progress-stream.ts`, `scripts/test-batch-voice-progress-ack.ts` (each wrapped by a one-line `test/*.test.mjs`). research/scripts.md also lists `test/fixtures/cloud-voice-view.mjs` and `test/support/feature-parity.mjs`; a grep for `fixtures/local-agent-stream` in the current tree finds only the two scripts.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19 | C5 | Duplicate esbuild loader with a different esbuild resolution (`createRequire(hostRoot/package.json)`) to support a `hostRoot` parameter nobody passes. | `bundleModule('apps/app/src/runtime/local-agent-stream.ts')`; drop `hostRoot`. | L |
| 2 | 9 | — | First check whether bundling is needed at all: if `local-agent-stream.ts` imports only Node-safe modules, a plain `await import()` under tsx is enough. | Try direct import first. | L |

## Proposed end state
Deleted as a file. The two batch-progress suites move into `test/` and load the parser through the shared loader or a direct import.
