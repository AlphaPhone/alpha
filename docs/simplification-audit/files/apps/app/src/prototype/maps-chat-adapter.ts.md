# apps/app/src/prototype/maps-chat-adapter.ts
- Lines: 86 | Role: an older, unimported copy of the chat Maps-card parser (`mapsChatText`) and `installMapsChatAdapter`. | Verdict: DELETE current content (reuse the file name as the home of the live `installMapsChatAdapter` moved from `maps-adapter.ts`)
- Importers: **none**. `git grep -n "maps-chat-adapter"` (whole repo minus docs/vendor) finds only comments (`prototype/calendar-approval-adapter.ts:68`, `scripts/prepare-client-features.ts:250`) and inventories (`specs/quint/application/manifest.json:4254,4299`, `test/support/feature-parity.mjs:385`). `main.tsx:46` imports `installMapsChatAdapter` from `./prototype/maps-adapter`; `maps-adapter.ts:2` imports `mapsChatText` from `../runtime/action-message-presentation`.
  Text/path pins: `specs/quint/application/manifest.json:4254` (source of the send-attempt model) and `:4299` (symbol `installMapsChatAdapter` at this path) – the manifest pins a symbol in a dead file; `test/support/feature-parity.mjs:385`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-53 | A2 / A7 | `MapsChatCard`, `MapsShareChoice`, `present`, `shareChoice`, `FORM`, `formBlock`, `mapsChatText` duplicate `runtime/action-message-presentation.ts:172-218` (the live version adds `mapQuery` to cards; `test/maps-chat-markup.test.mjs` tests the runtime one). | Delete. | None |
| 2 | 55-86 | A2 / A7 | `installMapsChatAdapter` here is an older version of `maps-adapter.ts:419-455` (live one adds `current()` fencing, a parse cache, `openMap`, `recording`/`hidden` checks). | Delete, and move the live function here from maps-adapter.ts (see that report). | None |
| 3 | 55 | C1 | `type Shell=Record<string,any>`. | Gone with deletion; moved code uses `ShellHost`. | — |
| 4 | — | A8 | Stale comments naming this file as live: `calendar-approval-adapter.ts:68` ("maps-chat-adapter.ts runs after this") and `scripts/prepare-client-features.ts:250` ("Agent Maps cards in chat (prototype/maps-chat-adapter.ts)"). | If the live adapter moves here, both become true again; otherwise point them at `maps-adapter.ts` / `runtime/action-message-presentation.ts`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `MapsChatCard` | type | 6 | `runtime/action-message-presentation.ts:172` | delete (runtime owns it) |
| `MapsShareChoice` | type | 8 | `runtime/action-message-presentation.ts:174` | delete |
| `MODES`, `placeLine`, `LOCATE_LINE`, `present`, `SHARE_CHOICE`, `shareChoice`, `FORM`, `formBlock`, `mapsChatText` | const/helpers | 10-53 | `runtime/action-message-presentation.ts:176-218` | delete |
| `installMapsChatAdapter` | function | 58-86 | `maps-adapter.ts:419-455` (live) | replace with the moved live version |

## Proposed end state
File contains only the live `installMapsChatAdapter` moved from `maps-adapter.ts` (~40 lines, importing `mapsChatText` from `runtime/action-message-presentation.ts`). If the move is not done, delete the file outright and its two inventory lines.

## Verification
`test/feature-parity.test.mjs` (inventory), quint application manifest symbol check (update `:4254`/`:4299` path to the moved function or to maps-adapter.ts), `test/quint-maps-share-choice.test.mjs`, `test/maps-chat-markup.test.mjs`, `npx tsc`.
