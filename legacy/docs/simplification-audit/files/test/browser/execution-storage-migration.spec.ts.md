# test/browser/execution-storage-migration.spec.ts
- Lines: 29 | Kind: Playwright, chromium, dev simulator. 7 of the 8 tests call `development-workflows`, `development-actions` and `development-execution-document` in the page (T6, s22/r7). 1 drives the recovery dialog | Verdict: **DELETE**
- Covers: the dev simulator's combined workflow and action execution document. Empty reads create nothing; concurrent workflow and proposal creation keep every receipt; a failed commit cannot erase workflow state; both legacy parts keep exact bytes; a retired owner can finish but not reserve or begin; recovery cannot erase a concurrent edit; damaged parts download and reset; retiring during a reply read cannot commit a run. Duplicates: the same `BrowserDomainDocument` contract appears in the digest-* migration specs and `domain-atomicity`; the real action journal on Android is `AlphaActionJournal` (instrumented on Android). Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-22, 27-29 | T6 | Every test except one is a dev-simulator API call with `toEqual`. | Delete. These modules move to `dev/` (U-R1). | Low |
| 2 | 14-16, 23-26 | A1 | Legacy parts `alpha.browser.agent.actions.local.v1` and `alpha.browser.workflows.local.v1` are kept byte-exact, with `legacyChanged`. | Delete with the reader (D1). | none |
| 3 | 12, 28 | P3 | Patches of `IDBObjectStore.prototype.put` and `browserDocuments.read`. | Deleted with the file. | none |
| 4 | 9, 15, 21, 25 | B3 | `identity={namespace:'local'} as any` bypasses the identity type to reach internals. | Deleted with the file. | none |

## Proposed end state
Delete the file. Workflow run, approval and journal journeys are covered on the product path by the workflows
journey and Android instrumentation, not by the simulator's storage.
