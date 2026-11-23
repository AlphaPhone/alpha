# test/workflow-reply-markup.test.mjs
- Lines: 37 | Kind: unit (esbuild-bundles `runtime/action-message-presentation.ts`, calls `workflowReplyText`) | Verdict: REWRITE as two cases in `journeys/chat.spec.ts`
- Covers: an agent reply's `[WORKFLOW]…[/WORKFLOW]` block becomes a run card and is removed from the text; malformed or unterminated blocks are hidden and give no card; prose naming the tag is kept; spoken text never contains the block. Duplicates: `test/browser/home-workflows.spec.ts` / chat specs may render a run card (verify). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | T3 | Bundles the module to a `data:` URL to import one pure function. | Delete. | None |
| 2 | 18-27 | keep | Streaming/truncated block hidden: visible effect in chat while a reply streams. | Journey case: a streamed reply ending mid-block shows only the text, then a run card when complete. | Low |
| 3 | 34-37 | keep | Speech text has no block. | Covered in voice journey if read-aloud of a workflow reply is exercised; otherwise drop. | Low |

## Proposed end state
File deleted. `journeys/chat.spec.ts` gains: (1) a reply carrying a well-formed workflow block shows "Submitted workflow run …" plus a run card titled from the block; (2) a malformed block shows no card and no raw JSON.
