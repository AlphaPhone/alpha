# specs/quint/application/MapsShareChoice.qnt
- Lines: 171 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (tail slice)
- Covers: the Maps share question in chat: a drawn button answers at most once, only for the same session/conversation/message/text and a quiet composer; failed sends re-offer (`installMapsChatAdapter` in `prototype/maps-adapter.ts`, `runtime/action-message-presentation.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `maps-share-choice.mjs` via `test/quint-maps-share-choice.test.mjs` (not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 29-31 | T2/T10 | Slices maps-adapter.ts from `export function installMapsChatAdapter(` to EOF, asserting it is the last export, prepends `type Bag=Record<string,any>`, strips and runs in vm. | Move the chat adapter to its own module (`prototype/maps-chat-adapter.ts`) and import it. | M: blocks any reorder of maps-adapter.ts |
| 2 | test 9-12 | B5 | Exact witness/trace counts asserted. | Drop. | L |
| 3 | manifest symbols | T10 | Pins adapter locals `answered`, `current`, `hasMapsChoice…`. | Pin files. | L |

## Proposed end state
- Model unchanged.
- `maps-chat-adapter.ts` imported by the harness.
