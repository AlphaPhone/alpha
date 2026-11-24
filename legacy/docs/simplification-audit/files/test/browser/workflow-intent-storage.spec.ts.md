# test/browser/workflow-intent-storage.spec.ts
- Lines: 66 | Kind: Playwright spec, chromium + firefox + webkit (listed in `scripts/storage-specs.ts:23`), 18 tests; almost all module-in-page | Verdict: MERGE (2 cases) into `journeys/workflows.spec.ts`; delete the rest
- Covers: `WorkflowIntentStore` admits one request per operation across two tabs, refuses stale acknowledgements, keeps requests on storage failure, isolates owners, backs up malformed and legacy entries, cancels queued admissions; `WorkflowProtocol` posts only after durable admission; the Recovery dialog resets requests for the captured account. Duplicates: two-tab single run is covered through the UI by `workflow-interruption-recovery.spec.ts` ("held in one tab blocks a second tab"). Callers/importers: `scripts/storage-specs.ts` (cross-browser project list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-38, 52-66 | T6 | 16 of 18 tests import `/src/runtime/workflow-intents.ts` or `workflow-protocol.ts` and never touch the UI. | Delete. | Store race rules lose direct coverage; the UI journeys cover the outcomes users see. |
| 2 | 20-26 | A1 | "legacy malformed requests" and "legacy writers require recovery" protect readers of old key formats. | Delete with the legacy reader (runtime chunk). | None. |
| 3 | 6-13 | T4 | Two-tab admission duplicates the interruption-recovery UI test. | Keep the UI one. | None. |
| 4 | 30-38 | ok | Durable admission before POST is a real safety rule. | Carry one UI step: storage failure on admission → Run sends nothing and says so. | Low. |
| 5 | 39-50 | ok | Recovery dialog for an unreadable intent (download, reset, captured account). | Carry `reset`; drop `leave` (pagehide via event). The download half depends on D3 (backup/export) — keep only if recovery downloads survive. | Owner question. |
| 6 | 40 | T8 | 120 s timeout. | Default timeout on the journey harness. | None. |

## Proposed end state
Two steps in the runs section of `journeys/workflows.spec.ts` (admission storage failure blocks Run; unreadable request
→ Recovery → Reset keeps the same account). Remove the entry from `scripts/storage-specs.ts`; the file is deleted.
