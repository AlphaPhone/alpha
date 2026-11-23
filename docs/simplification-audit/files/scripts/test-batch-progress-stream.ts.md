# scripts/test-batch-progress-stream.ts
- Lines: 64 | Kind: integration (esbuild-bundles the real `runtime/local-agent-stream.ts` and feeds it SSE `Response`s) | Verdict: MOVE to `test/voice-progress.test.ts` (merged with `test-batch-voice-progress-ack.ts`), delete shim `test/batch-progress-stream.test.mjs`
- Covers: the real agent stream parser emits a request-bound planning/tool progress cue only for a bound `VOICE_DM` turn, never on abort, and marks provisional vs settled direct text. Duplicates: none found (no other test calls `readLocalAgentStream`). Callers/importers: `test/batch-progress-stream.test.mjs` (one-line `import`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Already a `node:test` file; the `.test.mjs` shim only re-imports it. | Move the file into `test/` as the suite; delete the shim. | L |
| 2 | 5-6 | T9, B3 | `ALPHA_ACK_HOST_ROOT` knob ("local evidence may select an existing admitted fixture graph"): no workflow or script sets it (only `test/batch-ack-shell-retirement.test.mjs` reads the same knob). | Drop the knob; call `loadLocalAgentStream()`. | L |
| 3 | 4 | D7 | Needs `scripts/fixtures/local-agent-stream.ts` (esbuild bundle at import) because the module graph is not Node-importable. Cost: one esbuild bundle per run. | Keep the loader, move it to `test/fixtures/`; after Stage F (`@eliza/*` alias + Node-safe `import.meta.env`) import the module directly. | L |
| 4 | 11-14 | C3 | `collect` CustomEvent helper duplicated in the ack script (63). | One helper in the merged file. | L |

## Proposed end state
`test/voice-progress.test.ts` holds the five stream cases plus the kept ack cases, imports the stream module once through the shared loader, and needs no env knob or shim.
