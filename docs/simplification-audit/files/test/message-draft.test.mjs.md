# test/message-draft.test.mjs
- Lines: 87 | Kind: unit (real import of pure state transitions in `runtime/message-draft.ts`) | Verdict: DELETE
- Covers: SMS composer draft ownership and suggested-reply rules (MessageThreads.qnt). Duplicates: Quint refinement `specs/quint/refinement/native/telephony.mjs:32-79` imports and runs the same `message-draft.ts` transitions against MessageThreads traces (listed in `specs/quint/native/manifest.json`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-87 | T4 / T3 | Hand-picked transitions of a module whose full transition system is replayed by the Quint refinement. | Delete. | Low |
| 2 | 66-87 | - | `askedDraftPlaced` (draft the owner asked Alpha for): confirm the MessageThreads model covers it; if not, add the action to the model rather than keep this file. | Check before delete. | Medium |

## Proposed end state
File deleted. Coverage: the telephony refinement (model-level) and one journey in `journeys/messages.spec.ts` (suggestion lands, typing keeps owner text).
