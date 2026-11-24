# test/browser/workflow-notice-history.spec.ts
- Lines: 86 | Kind: Playwright spec, chromium, 12 tests; mostly module-in-page | Verdict: MERGE (3 cases) into `journeys/workflows.spec.ts` (notices section); delete the rest
- Covers: the workflow notice store: compaction at the 200-row capacity, exact replay and conflict after reload, history export and confirmed Free space, failure modes that preserve the document, duplicate rows, concurrent compaction/publication, lone surrogates, abort during hashing, ABA revision, late download URLs, older-copy download. Duplicates: `workflow-notices.spec.ts` (replay/conflict), `workflow-notice-lifecycle.spec.ts` (history download). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-54 | T6/T3 | Eight tests import `/src/browser/workflow-notices.ts` and patch `IDBObjectStore.prototype.put`, `crypto.subtle.digest` or documents; no user action. | Delete. | Store edge rules lose direct coverage (owner question). |
| 2 | 74-86 | A1 | "changed older data exposes both backups" protects the localStorage older copy (`legacyChanged`). | Delete with the legacy reader. | None. |
| 3 | 9-16 | ok | History controls export exact text and Free space needs confirmation (UI). | Carry. Note the download is an export; keep only if D3 leaves recovery downloads. | Owner question. |
| 4 | 34-38 | ok | Recovery reachable with no workflows (UI). | Carry. | None. |
| 5 | 3-8 | T7 | Capacity journey does 399 writes in page. | Carry as one step: seed a full history through the dev notice tool, see Free space, then a new notice posts. | Low. |
| 6 | 15 | B5 | Screenshot to a fixed `test-results/` path. | Use `info.outputPath` or drop. | None. |

## Proposed end state
Notices section: open Workflow history, download contains exact text, Free space → Confirm frees 1; empty list still
reaches Manage workflow history; full history blocks then frees space. File deleted.
