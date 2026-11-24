# test/optional-view-channel-chat.test.mjs
- Lines: 63 | Kind: transplant (esbuild-transforms the `async send(text:` method of `connectionController` plus regex-matched helper lines from `runtime/connection-ui.tsx`, and the `openInternalView`…`canonicalNotesKey` block of `prototype/agent-adapter.ts`, runs both in `vm`) with the real `ViewNavigationClient` (`loadBrowserModule`) | Verdict: DELETE (carry 2 behaviours into `journeys/chat.spec.ts`)
- Covers: ordinary chat sends proceed when the optional view-command feed is rejected or pending; an agent VIEWS handoff naming a view this phone does not have is reported in chat ("That screen is not on this phone.") without a claim or navigation. Duplicates: `test/browser/composer-dispatch.spec.ts` (sends); Quint `composer-send.mjs` refinement also slices `async send(`. Callers/importers: `npm test` glob; imports `test/fixtures/browser-source.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21, 47-48 | T2, D7 | Slices `async send(text:` … `\n  },\n};`, regex-matches `function conversationKey(` and `STOPPED_*_NOTICE` lines, slices between `let nativeNetworkGeneration =` and `let state:`. One of 19 readers of the `async send(` marker (cross-file-actions). | Delete. | None |
| 2 | 30 | T2 | Sandbox lists ~40 controller globals by hand. | Gone. | None |
| 3 | 11-13 | T3 | Replaces `globalThis.document` for the whole test process. | Gone. | None |
| 4 | 55-56 | A3 | The unmapped view is `wallet`, a deleted feature (D2). | Use any unknown id in the journey. | None |
| 5 | 22-42 | - | Sends are not blocked by an unavailable optional feed. | Journey: dev agent-mock with the view-command feed failing; three prompts get replies within normal time. | Medium |
| 6 | 45-63 | - | Unknown view handoff → one chat line, no navigation. | Journey: agent-mock returns a VIEWS result for an unknown view; chat shows "That screen is not on this phone." and the view does not change. | Low |

## Proposed end state
Deleted. `journeys/chat.spec.ts` gains two cases (send works while the optional view feed is down; an unknown view handoff becomes a chat line), both on the dev agent-mock harness.
