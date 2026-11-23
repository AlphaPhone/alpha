# specs/quint/refinement/application/composer-send.mjs
- Lines: 175 | Kind: Quint ITF replay over a source transplant (slices `agent-adapter.ts`, evaluates in `vm`) | Verdict: PORT
- Covers: chat composer send in `apps/app/src/prototype/agent-adapter.ts` (`p.send`, `p.agentSay`, dispatch helpers, session-change subscription) with real `AlphaClient` and the upstream `DurableDraftController`: refused sends restore text, held sends block the next, cancel waits for transport, unconfirmed after timeout, session switch keeps the newer composer. Duplicates: `chat-attachments.mjs` composer traces via `test/fixtures/chat-attachment-composer.mjs` slice the same regions. Callers: `test/quint-composer-send.test.mjs` only (not in `index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-39 | T10 / T2 | Slices `agent-adapter.ts` at `function createdFromSlot(`..`function selectedCloudName(`, `function planActionCard(`..`/** Context notices`, `function replyNotices(`..`/** Decline one pending proposal`, `  p.send = async function`..`  p.agentSay = function`, `  p.agentSay = function`..`  p.reply = function`, and `this.connectionUnsubscribe = connectionController.subscribe(() => {`..`    // Canonical is the default;`. Listed by research as top-10 fragile harness. | PORT with the `agent-adapter.ts` split (D1): `prototype/chat/composer-send.ts` exporting `installComposerSend(shell, deps)` (send, agentSay, dispatch helpers) and `subscribeChatSession(shell, deps)`; deps = `{alphaClient, connectionController, timers, notices, ...}`. Harness bundles and calls them. | M |
| 2 | 40-41 | T2 | Strips types from upstream `durable-draft-controller.ts` and imports it as a `data:` URL instead of importing the module. | Import from `.eliza/client-features/packages/ui/src/state/durable-draft-controller.ts` via `tsImport` (as done for `alpha-client.ts`). | L |
| 3 | 77-90 | T2 | `box` declares ~40 private names the slices reference (`NO_AGENT_SEND`, `privateLocalPreviewEnabled`, `retainReadReply`...). | Disappears with explicit deps. | M |
| 4 | 92-94 | — | Wraps the module-private `dispatched` decision to record it. | After the port, expose the decision through the attempt object. | L |
| 5 | 27-28 | C3 | Local `flush` and `gate` duplicates of `support.mjs` `tick`/`deferred`. | Import shared helpers. | L |

## Proposed end state
Composer send logic extracted into a module both this replay and `chat-attachments` import; no slicing, no vm.
Same scenarios/witnesses; shared deferred/flush helpers.
