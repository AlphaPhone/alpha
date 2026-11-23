# specs/quint/refinement/application/notes-files-media-itf.mjs
- Lines: 147 | Kind: shared formal-harness helper (Quint ITF simulation + step replay + esbuild product loader) | Verdict: KEEP, MERGE with its twins
- Covers: no behaviour itself. It runs `quint run --mbt --out-itf`, converts ITF values (`plain`), replays traces against a driver (`replayTraces`), and bundles a product module with stubbed imports (`loadProductModule`). That loader is the import-based mechanism every T10 port in this chunk should use.
- Importers (12, grep): application `note-source-dialog`, `note-web-source-dialog` (both DELETE), `notes-document-transfer`, `files-recent-index`, `media-copy-intent`, `camera-focus-writes`, `domain-document-creation`; native `video-edit-review`, `video-recorder`; services `system-picker-visibility`, and others. Survives the DELETEs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-26, 30-47, 94-123 | C5/C3 | Third copy of the same replay engine: `plain`/`modelTraces`/`replayTraces` also exist in `refinement/assistant-model-traces.mjs` (scenario+witness+random via `quint run`) and `application/browser-model-traces.mjs`. | One module, e.g. `specs/quint/refinement/support/replay.mjs`, exporting `plain`, `modelTraces({scenarios,witnesses,random})`, `replayTraces`. | Medium: three call signatures to reconcile; harnesses are many but edits are mechanical. |
| 2 | 70-85 | C3 | Fourth bundler: `support.mjs` `bundledSource/sourceModule`, `browser-model-traces.mjs` `loadBundled`, `photos-window.mjs` own build, `permission-choices.mjs` own build. | Keep this one (stubs + rewrite for mutation tests) as the single loader. | Low. |
| 3 | 126-147 | C3 | `memoryStorage` duplicates `support.mjs` `memoryStore`. | Keep one. | Low. |
| 4 | 1, name | D11 | Name says "Notes, Files and media"; it is the generic ITF replay. | Rename with the merge. | Low. |
| 5 | 35, 59 | cost | Each witness is a separate `quint run` with `--max-samples=2000` and a 120 s timeout. | Acceptable; note for CI lane budgeting. | — |

## Proposed end state
A single `refinement/support/replay.mjs` (ITF + scenario traces, replay, product loader, memory ports). All harnesses import it; `support.mjs`, `assistant-model-traces.mjs` and `browser-model-traces.mjs` shrink to re-exports or disappear.
