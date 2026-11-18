# test/browser/conversation-selection-storage.spec.ts
- Lines: 90 (17 KB) | Kind: module-in-page storage contract (T6/P1) with prototype surgery, chromium **+ firefox + webkit** (`scripts/storage-specs.ts:27`) | Verdict: **DELETE**; carry 2 cases into `journeys/chat.spec.ts`
- Covers: the **web** conversation-selection document (`runtime/conversation-selection.ts` → `BrowserJsonDomainDocument`; on Android the module uses plain `localStorage` and `conversationSelectionDocument()` throws): empty reads, multi-tab retention, CAS/ABA, retired owner, failed write, legacy bytes, recovery dialog with backup download, delayed creation, warm voice reuse, cancellation, history restore cancel, and fallback when the agent no longer has the saved conversation. Duplicates: none for the Android path (it is untested here). Callers/importers: `scripts/storage-specs.ts`. 15 tests (+loop) × 3 browsers ≈ 51 runs; 35 in-page `/src` imports.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-28, 65-70 | T6 | Nine tests only call `selectConversation`/`captureConversationChoice` and compare values. | Delete. | Low: they test the web document path, which the APK does not use. |
| 2 | 23-25, 68-70 | A1 | Two tests are about legacy byte preservation / "legacy changes require recovery" (D1). | Delete with the legacy reader. | none |
| 3 | 26-28 | D3 / P2 | Recovery dialog with "Download conversation selections backup", opened through the diagnostics backdoor. | Delete (backup/export is D3; recovery UI for a cache is an owner question). | none |
| 4 | 21, 30, 57, 72, 78, 85 | P3 | Patches `IDBObjectStore.prototype.put` and `LocalAgentProtocol.prototype.{createConversation,send,listConversations,messages}`. | — | none |
| 5 | 30, 41, 57, 72, 78, 84 | P7 | Uses `connectionController.startDevelopment('local')`, the dev profile connection. | — | none |
| 6 | 82-90 | — | "a saved conversation the agent no longer has falls back to its most recent / a new conversation" is a user-visible behaviour. | Carry into `journeys/chat.spec.ts` on the resident: agent plugin returns no such conversation; Send goes to the most recent / new one. | Medium: currently the only coverage. |
| 7 | 56-63, 71-76 | — | "disconnect/retirement while the conversation is being created sends nothing" is a user-visible safety rule. | Carry one case: hold `POST /api/conversations` in the agent plugin, stop the agent, release, assert no message POST. | Medium. |

## Proposed end state
File removed and dropped from `STORAGE_SPECS`. Two cases move to `journeys/chat.spec.ts`. The Android `localStorage` selection path gets its coverage from those two journeys running on the production harness (Android platform).
