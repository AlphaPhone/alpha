# test/browser/agent-conversation-migration.spec.ts
- Lines: 33 | Kind: Playwright spec, chromium dev; module-in-page (T6), 7 of 8 tests have no user action | Verdict: DELETE
- Covers: persistence semantics of the browser development agent simulator (`browser/development-agent-document.ts`, `development-connection.ts`, `development-cloud.ts`): empty profile, concurrent tabs, failed IDB commit, legacy localStorage migration, stale reset, personal-Cloud account switch, damaged-history recovery dialog. Duplicates: none in product terms (it tests a test double). Callers/importers: none; imports `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | P7/T6 | `boot` builds the dev bridge by importing `development-connection.ts`/`development-identity.ts`; all assertions read `readDevelopmentAgent`. This is the dev agent simulator, replaced by the resident agent on Android. | Delete. | Low. |
| 2 | 18-20 | A1/D1 | "migration retains exact legacy bytes" asserts the `legacy` envelope from `alpha.browser.agent.local.v1`. D1 deletes legacy readers. | Delete with the reader. | None. |
| 3 | 24-26 | D19 | Account-switch test drives `selectDevelopmentCloud` (`browser/development-cloud.ts` imports `CloudPersonalProtocol`), the personal-Cloud simulator D19 deletes. | Delete with the simulator. | None. |
| 4 | 16, 25, 28 | P3 | `IDBObjectStore.prototype.put` and `browserDocuments.read` monkey-patches. | n/a (file deleted). | None. |
| 5 | 31-33 | D3/A1 | Damaged dev-history recovery downloads a backup through the dev Connection panel; covers a dev surface and the "Download … backup" path of `browser/domain-recovery.ts`. The product recovery dialog is covered by `assistant-draft-recovery.spec.ts` (damaged draft). | Delete. | Low. |

## Proposed end state
File removed. The dev agent simulator, if it stays (D6/D19), gets at most one smoke step in `journeys/production-gating.spec.ts`/dev smoke ("scripted reply is shown"). Remove from any storage list (it is not in `scripts/storage-specs.ts`).
