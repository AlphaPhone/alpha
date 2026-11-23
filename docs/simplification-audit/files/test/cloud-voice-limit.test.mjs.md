# test/cloud-voice-limit.test.mjs
- Lines: 146 | Kind: mixed: transplant (cases 1, 2, 7: `runtime/cloud-voice.ts` with imports stripped, run in `vm`), transplant (case 3: `noteCloudServiceLimit` sliced from `connection-ui.tsx`), unit (case 4: real `readCloudVoiceLimit` / `cloudVoiceLimitOf` from `runtime/cloud-voice-limit.ts`), JVM (case 5: product `CloudVoiceLimit.java` + `test/fixtures/CloudVoiceLimitTest.java`) plus source-text on `AlphaVoiceCloudPlugin.java`, transplant + source-text (case 6: `voice-selection.ts`, `browser/voice.ts`) | Verdict: REWRITE: MERGE cases 4 and 5 (JVM part) into `test/integration/voice.test.ts` / JVM lane; carry the copy into `journeys/voice.spec.ts`; DELETE the rest
- Covers: Cloud speech 429 carries only retry facts; plan-limit wording with retry time, recording kept, never provider text; the limit is recorded as the account's `lastServiceLimit` only for that account and not for developer or own-key speech; retry facts parsed from body/Retry-After with bounds; native `CloudVoiceLimit` keeps the same facts and replays only a cache-warming 503; voice route stays on device while a limit is in force. Duplicates: `test/cloud-voice-profile.test.mjs` case 7 (same `cloudVoiceFailure` copy), `test/voice-calm-cloud-errors.test.mjs`, `test/browser/browser-speech.spec.ts` (request-limit copy). Callers/importers: `npm test` glob; imports `support/strip-types.mjs`; uses `.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-35 | T2 | `cloud-voice.ts` evaluated from text with a 25-key box. | Delete; once `cloud-voice.ts` imports cleanly in Node (it only needs `registerPlugin` and the controller injected), test `cloudVoiceFailure` by import. | Low |
| 2 | 72-85 | T2 | `noteCloudServiceLimit` sliced at `'\n  },'`. | Delete; covered by the journey (limit recorded -> next Talk on device). | Low |
| 3 | 87-97 | T3 (acceptable) | Real parser at the network boundary. | Keep in `test/integration/voice.test.ts`. | None |
| 4 | 99-105 | - | Committed JVM test of a product class. | Keep in the JVM lane. | None |
| 5 | 106-121 | T1 | Ten regexes over `AlphaVoiceCloudPlugin.java`, including exact counts (`submit(call,` must occur 7 times). | Delete. | None |
| 6 | 124-138 | T2 / T1 | `voice-selection.ts` evaluated from text; regex on `browser/voice.ts`. | Delete; journey covers route choice. | Low |
| 7 | 17 | D13 | Deep `.eliza` import. | `@eliza/*` alias. | None |

## Proposed end state
File deleted. `readCloudVoiceLimit` table in `test/integration/voice.test.ts`; `CloudVoiceLimitTest.java` in the JVM lane; `journeys/voice.spec.ts` gets one 429 case (copy with retry time, recording kept, next Talk uses the device until the limit passes, own-key 429 shows Cartesia copy).
