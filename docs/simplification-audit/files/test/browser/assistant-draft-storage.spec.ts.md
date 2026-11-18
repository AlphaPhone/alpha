# test/browser/assistant-draft-storage.spec.ts
- Lines: 67 | Kind: Playwright spec, chromium + firefox/webkit (`scripts/storage-specs.ts:3`); module-in-page unit tests (T6), 11 tests with loops | Verdict: DELETE
- Covers: `assistant-draft-store.ts` compare-and-swap receipts, abort, binding isolation; `native-assistant-draft-recovery.ts` CAS contract; `native-recovery-backup.ts` byte export; device recovery dialog opened by import. Duplicates: `assistant-draft-recovery.spec.ts` (persistence, conflict, recovery through UI). Callers/importers: `scripts/storage-specs.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-26 | T6/T3 | Four tests call `assistantDraftStore(...).save/read` directly with no UI. | Delete; observable behaviour is in the chat journey. | Low. |
| 2 | 27-30 | P2/P3 | Binding test patches `LocalAgentProtocol.prototype.listConversations/messages` and calls `connectionController.restoreHistory`. | Delete. | Low. |
| 3 | 31-43 | T3 | Native recovery contract tested with an in-page fake `{read,compareExchange}`; unit test. | Delete; the native side is covered by Android instrumentation if anywhere. | Medium: only browser-side coverage of the native draft CAS shape. |
| 4 | 44-53 | D3 | `saveNativeRecoveryBackup` (`runtime/native-recovery-backup.ts`) is the test-mocks-only native recovery backup D3 deletes; its only other importer is `browser/domain-recovery.ts:24`. | Delete with the module. | None. |
| 5 | 54-67 | T6 | Device recovery dialog opened via `openDomainRecovery` import, not via UI. | Delete; browser-storage recovery dialog is covered in the chat journey. | Low. |
| 6 | n/a | P8 | Three engines. | Remove from `storage-specs.ts`. | None. |

## Proposed end state
File deleted and removed from `scripts/storage-specs.ts`. Coverage lost: the CAS race of two concurrent `save(null, …)` calls (test 2) and the native CAS contract shape; see chunk summary.
