# test/browser/assistant-draft-recovery.spec.ts
- Lines: 52 | Kind: Playwright spec, chromium, 8 tests; UI driving plus a store probe via `/src` imports and prototype patches | Verdict: MERGE into `journeys/chat.spec.ts` (draft continuity section)
- Covers: the composer's unsent draft survives reload, is per connection, survives a failed autosave with explicit retry, is cleared once after a confirmed send, detects a competing tab, and offers backup+reset recovery for damaged storage. Duplicates: `assistant-draft-storage.spec.ts` (same store at module level), `assistant-draft-review.spec.ts` (same composer). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-20 | T6 | `saved()` reads the store through `connectionController.assistantDraftBinding` + `assistantDraftStore`. | Prove persistence by reload (the visible value), wait on the draft status disappearing. | Low. |
| 2 | 34, 50 | P3/P2 | `LocalAgentProtocol.prototype.send` patched; `connectionController.startDevelopment/offline` called directly. | Run on the production project with `resident-stub` (records posts); switch connection through Settings. | Medium. |
| 3 | 30 | P3 | `IDBObjectStore.prototype.put` patched to throw QuotaExceeded on `documents`. | Acceptable as a storage-boundary fault until a CDP quota helper exists in the harness. | Low. |
| 4 | 3-12 | P11/A8 | 90 s per test, 15 s expect timeouts, "#700" history comment. | Default timeouts once the harness boots fast; drop the history comment. | Low. |
| 5 | 49-52 | P2 | "different tab restart selection" seeds conversations via `editDevelopmentAgent` and `conversation-selection` internals. | Drop; conversation targeting is covered by chat continuity specs. | Low. |

Cases worth carrying: multiline draft survives reload and clearing stays cleared; failed autosave keeps text, Retry saves it; Enter sends the reviewed text once and clears the draft; draft is per connection (offline vs agent) through visible connection switching; damaged draft: backup download + confirmed reset; competing tab shows "Review the saved copy" (only if multi-window is a product case).

## Proposed end state
File deleted; five or six steps in `journeys/chat.spec.ts` on the production harness. No `/src` imports, no prototype patches except the quota fault.
