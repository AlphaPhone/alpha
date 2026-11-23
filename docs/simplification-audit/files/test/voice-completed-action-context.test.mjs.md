# test/voice-completed-action-context.test.mjs
- Lines: 58 | Kind: transplant (slices `metadata(...)` out of `apps/app/src/runtime/view-navigation.ts` between `\tmetadata(context:` and `\n\tcapture(`; regex-extracts `voiceRendererMetadata(context:ContextEnvelope){...}` from `connection-ui.tsx`; slices the `getUiContext:()=>{` callback after `developmentCartesiaConversation({` in `prototype/voice-adapter.ts`; strips and evals upstream `ui-context.ts` and `voice-session-protocol.ts`) plus a projection-equality check | Verdict: DELETE
- Covers: voice UI context reports `viewDelivery:'completed-action'` only for a bound renderer; upstream parsers accept only the literal protocol values. Duplicates: `test/browser/view-navigation.spec.ts:100` (`viewDelivery` in the posted metadata), `test/browser/voice-owned-navigation.spec.ts` (bound navigation through voice). Upstream parsers are upstream's. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-22 | T2/D7 | Three text slices of product files glued into `new Function`; depends on tab indentation and exact one-line method text in `connection-ui.tsx:2252`. Blocks the formatter (D9) and the `connection-ui.tsx` split. | Delete. | Low |
| 2 | 31-40 | T5/B5 | Asserts the `.eliza` projection equals `vendor/eliza` and the `.source.json` stamp: the projection script already authenticates this. | Delete. | Low |
| 3 | 31-58 | T5 | Three tests of upstream parsers (`parseVoiceUiContext`, `parseServerControl`). | Delete; upstream owns them. | Low |
| 4 | 23-29 | gap | "never invents completed-action after sensitive context/disposal/owner replacement" is the one Alpha rule here. | Covered in the browser by `voice-owned-navigation.spec.ts` (account/selection change refuses continuation); no carry needed. | Low |

## Proposed end state
File deleted. Development-only path (`developmentCartesiaConversation`); its observable rule is held by the voice
navigation journey.
