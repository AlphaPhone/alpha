# specs/quint/refinement/application/chat-attachments.mjs
- Lines: 151 | Kind: Quint refinement harness, source transplant (slices `agent-adapter.ts`) plus composer fixture traces | Verdict: PORT
- Covers: chat attachment persistence keyed by origin/owner/agent/conversation/client message id (`attachmentKey`, `saveAttachment`, `restoreAttachments` in `apps/app/src/prototype/agent-adapter.ts:175-197`) and the composer's held attachment save across owner/conversation switches, pre-dispatch refusal and recorded confirmation. Duplicates: `test/chat-attachment-composer.test.mjs` drives the same `chatAttachmentComposerFixture` scenarios directly (refusal restores draft, held save after owner/conversation switch) and also calls `checkChatAttachments()`. Callers: `test/chat-attachment-composer.test.mjs`, `index.mjs`. No `test/quint-chat-attachments.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 102-107 | T10 / T2 | Slices `agent-adapter.ts` from `function attachmentKey(` to `\nconst preDispatchRefusals`, strips types and evaluates with `new Function('browserDocuments', ...)`. | PORT: move `attachmentKey`/`saveAttachment`/`restoreAttachments` into `apps/app/src/runtime/chat-attachments.ts` taking `documents` as a parameter (or importing `browserDocuments` and letting the harness bundle with a port). Export all three. | M |
| 2 | 6, 16-93 | T2 (via fixture) | `test/fixtures/chat-attachment-composer.mjs` slices five regions of `agent-adapter.ts` (`class NotDispatched`, `createdFromSlot(`..`selectedCloudName(`, `p.send`..`p.agentSay`, the `connectionController.subscribe` block, `api.composeTranscriptQuestion=` and the render block). Same regions as `composer-send.mjs`. | PORT with the `agent-adapter.ts` split (D1): a `composer-send.ts` module exporting a `createComposerSend(deps)`; both harnesses import it. | M |
| 3 | 97-100 | T10 / broken-later | `sources` hashes `specs/quint/refinement/application/index.mjs` and `test/quint-application-refinement.test.mjs`. When the aggregate test is deleted, `captureInputs` will fail on the missing file. | Remove these two entries. | M |
| 4 | — | T4 | The host test duplicates the composer scenarios with plain asserts. | Keep only the Quint campaign (it already contains those scenarios); delete the four plain tests in `test/chat-attachment-composer.test.mjs` and rename it `test/quint-chat-attachments.test.mjs`. | L |
| 5 | 109-144 | — | The helper campaign also asserts a different `clientMessageId` does not inherit the attachment: a real key-isolation property. | Keep. | — |

## Proposed end state
Attachment storage helpers live in their own runtime module and are imported; composer traces use an extracted composer module.
One per-model test file; no aggregate paths in the inputs.
