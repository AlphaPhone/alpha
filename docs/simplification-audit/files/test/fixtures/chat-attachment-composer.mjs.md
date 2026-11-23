# test/fixtures/chat-attachment-composer.mjs
- Lines: 187 | Kind: transplant (8 marker slices of `agent-adapter.ts`, type strip, `runInNewContext` with ~35 fake ports) | Verdict: DELETE as a test fixture; Quint harness PORTs
- Covers: attaching a Notes transcript to the composer, owner/conversation switch while sending, held local storage write, refusal before dispatch, attachment record per owner+room (`chat-attachment-v1`). Duplicates: chat attachment Playwright specs (tests-browser). Callers/importers: `test/chat-attachment-composer.test.mjs` (research: delete, C), live Quint `specs/quint/refinement/application/chat-attachments.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23-32 | T2/T10 | Anchors in `apps/app/src/prototype/agent-adapter.ts`: `'class NotDispatched extends Error'`, `'function createdFromSlot('`..`'function selectedCloudName('`, `'  p.send = async function'`..`'  p.agentSay = function'`, `'    this.connectionUnsubscribe = connectionController.subscribe'`..`'    // Canonical is the default;'`, `'    api.composeTranscriptQuestion='`..`'    api.composeContentQuestion='`, `'    const photo=this.cameraAttachment;'`..`'    out.messageComposeContext='`. All present; `agent-adapter.ts` is a D1 split target. | PORT: export `sendComposer`, `attachTranscript` from a composer module with injected ports. | High |
| 2 | 81-116 | T3 | ~35 hand-written globals (`NO_AGENT_SEND`, `RESIDENT_*_NOTICE`, `planActionCard`, ...): every new free identifier in `p.send` needs a fake here. | Same as 1. | High maintenance |
| 3 | 6 | D13 | Deep import into `.eliza/client-features/...source-links.ts`. | `@eliza/*` alias. | none |
| 4 | 136 | D8/T8 | One-line busy loop with 5 s deadline. | `waitFor`. | Low |

## Proposed end state
Delete with the host test. `journeys/chat.spec.ts` (or notes): attach a transcript from Notes, send succeeds and shows the attachment, switching conversation mid-send keeps the draft in the original room, refused connection restores the draft. The Quint chat-attachments driver imports the exported composer module.
