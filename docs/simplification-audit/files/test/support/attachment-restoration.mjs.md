# test/support/attachment-restoration.mjs
- Lines: 11 | Kind: transplant helper (T2) | Verdict: DELETE
- Covers: nothing on its own. It slices `apps/app/src/prototype/agent-adapter.ts` from `function attachmentKey(` to `\nconst preDispatchRefusals`, strips types and runs it in `new Function` with `browserDocuments.read` stubbed to `null`, so `restoreAttachments` always finds no attachment. Duplicates: none. Callers/importers: `test/assistant-draft-dispatch.test.mjs` (mixed source-text/transplant, reviewed elsewhere as delete/rewrite) and `test/notes-owner-retirement.test.mjs` (transplant over legacy Notes, D1 DELETE).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | T2, T10 | Cuts product source at two literal markers (`function attachmentKey(`, `\nconst preDispatchRefusals`) at `agent-adapter.ts:176-199`; any reorder or the D1 `agent-adapter.ts` split breaks both importers. | Delete with both importers. | none |
| 2 | 11 | T3 | The stub makes the helper a no-op (`read` returns `null`), so importers only get "messages come back unchanged". It protects no attachment behaviour. | Delete. | none |

## Proposed end state
File deleted together with `notes-owner-retirement.test.mjs` and the transplant cases of `assistant-draft-dispatch.test.mjs`.
Attachment restoration after reload (real `browserDocuments`) belongs in `journeys/chat.spec.ts`: send a photo, reload, the
attachment chip is back. No other importer exists (`git grep attachment-restoration` finds only the two tests).
