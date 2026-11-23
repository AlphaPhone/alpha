# test/browser/connection-preference-storage.spec.ts
- Lines: 41 | Kind: module-in-page (T6/P1) with prototype surgery, chromium **+ firefox + webkit** (listed in `scripts/storage-specs.ts`) | Verdict: **DELETE**
- Covers: in a normal (web) browser, a selection/Cloud-service change in another tab cancels a delayed Cloud identity lookup and the Cloud service preference is owned independently of the selection. Duplicates: none live. Callers/importers: `scripts/storage-specs.ts:20` lists it. 6 tests × 3 browsers = 18 runs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 17, 18 | A3 (C4) | Imports `runtime/development-cloud-agents.ts` (deleted with C4) and calls `connectionController.cloudList` (one of the hosted controller wrappers C4 deletes). delete-candidates C4 names this spec at line 18. | Delete with C4. | none |
| 2 | 15-16 | P3 | Replaces `cloudCredentialStore.read` and `CloudProtocol.prototype.identity`. | — | none |
| 3 | 22-41 | T6 | No user action; asserts controller state. | — | none |
| 4 | — | P2 (storage lane) | The web build removes the Cloud service marker on start (`connection-boundaries.production.spec.ts:313`), so the "independent Cloud service ownership" contract is not a shipping behaviour. | Remove from `STORAGE_SPECS`. | none |

## Proposed end state
File removed and its entry dropped from `scripts/storage-specs.ts` (or the whole cross-browser lane, an owner decision in research §10.3).
