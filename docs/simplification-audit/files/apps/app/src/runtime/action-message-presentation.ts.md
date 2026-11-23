# apps/app/src/runtime/action-message-presentation.ts
- Lines: 246 | Role: display-only projections of chat rows: device-action/receipt collapsing, upstream system-notice rewording, Maps card markup, `[WORKFLOW]` run blocks, check-in CHOICE suffix | Verdict: SPLIT (four unrelated concerns) + SIMPLIFY
- Importers: prototype/agent-adapter.ts, prototype/maps-adapter.ts, prototype/maps-chat-adapter.ts, prototype/voice-adapter.ts, runtime/connection-ui.tsx, runtime/device-actions.ts. Text/path pins: `specs/quint/application/manifest.json` symbol pins `mapsChatText` and **`SHARE_CHOICE`** (a non-exported const — renaming it breaks the manifest); `specs/quint/refinement/application/composer-send.mjs`, `maps-share-choice.mjs`; `scripts/test-connection-history.ts`; 16 test files incl. `test/system-notice-collapse.test.mjs` (pins the UPSTREAM_* strings byte-equal), `test/white-label-copy.test.mjs`, `test/maps-chat-markup.test.mjs`, `test/workflow-reply-markup.test.mjs`, `test/checkin-choice-presentation.test.mjs`, `test/action-message-presentation.test.mjs`, `test/fixtures/cloud-voice-view.mjs`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D1 | Four independent concerns in one module: action/receipt projection (1-81), system notices (83-168), Maps markup (171-219), workflow run blocks (221-246). | Split into `chat/action-projection.ts`, `chat/system-notices.ts`, `chat/markup.ts` (Maps + workflow + all CHOICE parsers). | Low; update 6 importers and the manifest/test paths. |
| 2 | 10, 191-196 | C3/C5 | Four hand-written parsers of the same `[CHOICE:<kind> id=…]\n…\n[/CHOICE]` markup: `checkinDisplayText` (L10), `SHARE_CHOICE`/`shareChoice` (L191-196), and in calendar-approval.ts `calendarReviewText` (L6) and `inboxChoiceText` (L22). Each re-implements line splitting on `=` and validation. | One `parseChoiceBlocks(text, kind)` returning `{id, options[], start, end}`; each caller keeps only its own acceptance rule. Keep `SHARE_CHOICE` name (manifest). | Medium: each parser has subtly different acceptance (lastIndexOf vs indexOf `=`, trailing-whitespace rules); port the existing tests first. |
| 3 | 217, 245 | C3 | `rendered.replace(/\n{3,}/g,'\n\n').trim()` after removing blocks, repeated here twice and in calendar-approval.ts:28. | `tidyAfterRemoval(text)` in the markup module. | None. |
| 4 | 5, 133 | C1 | `type Message = Record<string, any>` (Bag twin) and a partial `ChatRow` type for the same chat rows. | One exported chat-row type (prototype model typing, see types.md) used by both. | Low. |
| 5 | 57, 69 | D10 | Behaviour keyed on display labels: `message.text === REVIEW_TEXT` ('Review on phone') hides rows; `stored.card.title === 'Completed'` selects the browser summary. | Key on a flag set where the row is created (e.g. `reviewPrompt:true`, `card.outcome==='completed'`). | Medium: requires the writers in agent-adapter/connection-ui to set the flag. |
| 6 | 38-81 | D9 | `projectActionMessages` repeats `message.from === 'agent' && message.card?.proposalId` / `deviceReceipt === true && !message.card` five times. | Extract `isProposal(m)`, `isReceipt(m)`, `isOrdinaryReply(m)` (reuse `ordinaryReply` at L138). | Low. |
| 7 | 102-112 | A7 | `UPSTREAM_MODEL_UNAVAILABLE_NOTICE`, `UPSTREAM_RUNTIME_ERROR_NOTICE`, `MODEL_UNAVAILABLE_NOTICE`, `RUNTIME_ERROR_NOTICE`, `RUNTIME_ERROR_BACKGROUND_NOTICE` exported only for `test/system-notice-collapse.test.mjs`; `WorkflowRunCard` has 0 importers. | Unexport (copy strings unchanged). | Low; test must assert through `collapseSystemNotices`. |
| 8 | 83-96, 99-101 | A8 | 14-line essay naming upstream file paths and history ("re-posts it on every agent start and retry"). | Replace with 3 lines on what the function does. | None. |
| 9 | 27, 74, 202, 231 | B1 | `try{new URL(url)...}catch{}`, `try{browserNavigationSummary(...)}catch{return message;}`, `try{JSON.parse(json)}catch{return false;}` ×2 | Keep L27/202/231 (malformed agent markup stays literal text is the spec); L74 re-parses a `browserDestination` that `succeededBrowserDestination` already validated when stored — drop the try. | Low. |
| 10 | 202, 232 | C3 | Inline plain-object guards `!!body&&typeof body==='object'` / `!value||typeof value!=='object'||Array.isArray(value)`. | Shared `isRecord`. | None. |
| 11 | 10 | C3 | UUID regex inlined inside the check-in pattern; twins calendar-approval.ts:3, google-accounts.ts:52, local-agent.ts:183, resident-recovery.ts:33. | Build from a shared `UUID_SOURCE` string. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Message` | type | 5 | `Bag` ×60 app-wide; `ChatRow` L133 | shared chat-row type |
| `ChatRow` | type | 133 | `Message` L5 | shared chat-row type |
| `browserCardUrl` | helper | 23-28 | none | action-projection |
| `shareChoice` / `SHARE_CHOICE` | helper/const | 191-196 | calendar-approval.ts `reviewPattern` L6, `inboxChoiceText` L22, check-in regex L10 | chat/markup.ts `parseChoiceBlocks` |
| `formBlock`, `runCard` | helper | 201-203, 230-236 | inline `isRecord` twins | chat/markup.ts |
| `MODES` travel-mode labels | const | 176 | maps/guidance.ts labels (check) | maps/guidance.ts |
| `REVIEW_TEXT` | const | 17 | written in agent-adapter.ts (literal 'Review on phone') | replace with flag (finding 5) |

## Proposed end state
Three files under `runtime/chat/` totalling ~200 lines: action projection (~60, with named predicates and flag-keyed hiding), system notices (~55, constants unexported), markup (~85, one CHOICE parser used by check-in, Maps share, calendar review and inbox choices). Copy and wire formats unchanged.

## Verification
`test/action-message-presentation.test.mjs`, `test/system-notice-collapse.test.mjs`, `test/maps-chat-markup.test.mjs`, `test/workflow-reply-markup.test.mjs`, `test/checkin-choice-presentation.test.mjs`, `test/browser-receipt-order.test.mjs`, `test/white-label-copy.test.mjs`, `test/calendar-approval-ui.test.mjs`; quint maps-share-choice and composer-send refinements (update manifest paths for `mapsChatText`/`SHARE_CHOICE`).
