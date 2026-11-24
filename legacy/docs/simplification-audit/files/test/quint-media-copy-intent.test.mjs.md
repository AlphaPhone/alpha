# test/quint-media-copy-intent.test.mjs
- Lines: 15 | Kind: Quint replay wrapper (`replayMediaCopyIntent`, `specs/quint/refinement/application/media-copy-intent.mjs`) + a source-rewrite canary | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: saved-copy request storage (`runtime/media-copy-intent.ts`) follows MediaCopyIntent on both platforms (400 traces). Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob; its path is also named in the model's `abstractions` prose in the family `manifest.json` (update the text when the file goes). Its driver `.md` gives the `node --test` command.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-10 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 12-15 | T5, T10 | Canary rewrites `if(JSON.stringify(decode(archive))!==JSON.stringify(expected))throw`; breaks under Prettier. | Delete. | Medium |
| 3 | — | A1 | C6 lists `media-copy-intent.ts:14` as a legacy reader. | Re-check the model after C6. | Low |

## Proposed end state
Deleted; MediaCopyIntent registered in the application index.
