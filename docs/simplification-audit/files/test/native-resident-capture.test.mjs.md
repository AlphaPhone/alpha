# test/native-resident-capture.test.mjs
- Lines: 43 | Kind: unit of upstream `openNativeResidentCapture` (`.eliza/client-features/packages/voice/src/native-live-voice.ts`) with a stub port | Verdict: DELETE
- Covers: native live capture never reads PCM in the renderer, owner change cancels and drops late transcripts, abort beats delayed start and graceful close, unconfirmed server close is reported. Duplicates: `native-live-start-cancellation.test.mjs` (same module, abort during start), `test/live-voice.test.mjs`, `test/browser/live-voice.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T5 | Entire file tests code generated from `vendor/eliza`. | Delete; upstream follow-up (D14). | Low |
| 2 | 6 | T8 | `flush` = 10 microtask hops as a timing assumption. | Gone. | None |

## Proposed end state
File deleted. Alpha's live-voice journey (`journeys/voice.spec.ts`) keeps the user-visible part: cancel during start,
owner change drops the turn.
