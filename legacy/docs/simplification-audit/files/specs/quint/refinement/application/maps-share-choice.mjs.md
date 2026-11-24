# specs/quint/refinement/application/maps-share-choice.mjs
- Lines: 128 | Kind: Quint ITF trace replay (tail-slice transplant, `MapsShareChoice`, live) | Verdict: PORT
- Covers: the Maps "share location?" chat buttons answer at most once, only for the same session/conversation/message/revision and a quiet composer; failed sends re-offer (`installMapsChatAdapter` in `prototype/maps-adapter.ts`, real `mapsChatText` from `runtime/action-message-presentation.ts`). Duplicates: none. Callers/importers: `test/quint-maps-share-choice.test.mjs` only — not in the aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-31 | T2/T10 | Slices `maps-adapter.ts` from `'export function installMapsChatAdapter('` to end of file, asserts it is the last export, prepends `type Bag=Record<string,any>`, strips and runs in `vm`. Any function added after it, or moving `Bag`, breaks it. | Move the chat adapter to `apps/app/src/prototype/maps-chat-adapter.ts` (it shares nothing with the map adapter but `mapsChatText`) and import it with `bundledSource` + a `connectionController` port stub. | M |
| 2 | 27-28 | — | Parser is imported for real via esbuild. Correct. | Keep. | — |
| 3 | 22 | C3 | Local `tick`. | `support.mjs`. | — |
| 4 | 18 | C5 | Uses `services/maps-model-traces.mjs` `modelTraces/replayTraces`, while `media-copy-intent.mjs` uses a second ITF helper (`notes-files-media-itf.mjs`). | One ITF replay helper module. | L |
| 5 | test wrapper | B5 | Exact scenario/witness/trace counts; `console.log` of the receipt. | Drop. | L |

## Proposed end state
Imports `maps-chat-adapter.ts`; same replay; shared ITF helper; run by the manifest runner.
