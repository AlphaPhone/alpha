# test/voice-start-failure-copy.test.mjs
- Lines: 46 | Kind: transplant (slices the start-catch expression of `prototype/voice-adapter.ts` by a 120-character literal, and `cloudVoiceFailure` out of `runtime/cloud-voice.ts` between `function voiceLimitMessage(` and `/** Product registration only;`, then `new Function`) + one real import (`voice-states.ts`) | Verdict: DELETE
- Covers: voice start failures never show raw/private text; auth, provider, rate-limit, upload and microphone failures show actionable copy; own-key failures name Cartesia. Duplicates: `test/voice-calm-cloud-errors.test.mjs`, `test/voice-copy-presentation.test.mjs`, `test/browser/voice-composer-recovery.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | T2 | Slices by an exact minified statement (`}catch(failure){if(token!==generation||…conversationState=`); the formatter (D9) breaks it. | Delete. | Low |
| 2 | 13-14 | T2/C1 | `cloudVoiceFailure` evaluated with six positional fakes. | Delete. | Low |
| 3 | 24 | T1 | `assert.match(catchBody, /if\(token!==generation…/)`. | Delete. | None |

## Proposed end state
File deleted. Copy coverage moves to `journeys/voice.spec.ts` with the voice fixture's failure injection (`voice-fixture-failure-metadata.ts`): an unknown start failure shows "Voice could not start. Try again, or use the keyboard."; a 401 shows the Cloud sign-in copy; an own-key 401 names Cartesia and no Cloud plan.
