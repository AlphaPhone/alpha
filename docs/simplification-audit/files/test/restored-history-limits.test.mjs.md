# test/restored-history-limits.test.mjs
- Lines: 67 | Kind: transplant (four marker slices of `connection-ui.tsx` + a slice of `prototype/model.js` render code via `new Function`) | Verdict: REWRITE as cases in `journeys/chat.spec.ts`
- Covers: restored chat history keeps rows over 200,000 characters (full text kept, display clipped with "[Message shortened for display]", no surrogate split); invalid rows still fail; a long proactive message is shown clipped, not dropped. Duplicates: none in `test/browser` (no spec contains the marker or 200001). Callers/importers: `npm test` glob; imports `action-message-presentation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-25 | T2 | Slices four functions out of `connection-ui.tsx` and a render fragment from `model.js` (D1 split targets). | Delete. | Low |
| 2 | 28-37 | T3 | Hand-built `box` world with fake `remote`. | Goes with the file. | Low |

## Proposed end state
Delete after `journeys/chat.spec.ts` carries: (1) resident stub returns history with a 200,001-character assistant row;
the bubble ends with the marker and the copy action yields the full text; (2) a proactive 200,001-character event is
shown clipped. The surrogate-pair edge can be a third case with an emoji at the boundary.
