# test/maps-chat-markup.test.mjs
- Lines: 134 | Kind: tests 1-4 integration of the wire contract (esbuild-bundles the pinned `plugin-maps/src/card.ts` and core `interaction-serialize.ts` producers, real `action-message-presentation.ts` parser); tests 5-9 transplant (slices `prototype/maps-adapter.ts` from a doc comment, runs in `vm` with a fake Shell) | Verdict: MERGE 1-4 into `test/integration/maps.test.mjs`; REWRITE 5-9 as cases in `journeys/maps.spec.ts`
- Covers: agent Maps cards and the share choice render as cards from the exact upstream wire format; malformed/out-of-policy markup stays literal; a share answer is sent once and never after context changes. Duplicates: `test/browser/maps-chat-cards.spec.ts` (render only, one test). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-51 | - | Producer→parser contract across the pin: drifts are caught. Bundles three entries with esbuild per run. | Keep 2 cases: card shapes (place/route/locate/handoff/choice) and the literal-fallback table. Import directly under the shared loader instead of esbuild if possible. | Low |
| 2 | 53-65 | T2 | Slices `maps-adapter.ts` at `/** Presentation only:`, injects `type Bag`, evals with a fake `Shell` class and a global fixture. | Delete. | Medium |
| 3 | 67-113 | - | One tap sends exactly once; older question, draft, edit, busy, account/conversation/message/recording/hidden changes never send. Only covered here. | Rewrite as 3 journey cases on the dev profile: tap sends once and the choice disappears; typing a draft blocks send with a toast; switching conversation retires the choice. | Medium |
| 4 | 115-134 | T3 | Parse-count memoisation (a performance detail) asserted by counting calls. | Delete. | Low |

## Proposed end state
Wire-contract cases in `test/integration/maps.test.mjs`; send-once/staleness cases in `journeys/maps.spec.ts`
(extending today's `maps-chat-cards.spec.ts`). File deleted.
