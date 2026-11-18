# apps/app/src/runtime/local-speech-text.ts
- Lines: 91 | Role: speech-text policy: refuses links/emails/credentials for explicit Listen, refuses only credential-like text for spoken replies, normalises numbers/markdown/punctuation for speech, and splits into ≤300-char sentence chunks. | Verdict: KEEP
- Importers: 5 (`local-speech-playback.ts`, `prototype/local-speech-playback.ts`, `prototype/voice-adapter.ts`, `runtime/local-reply-speech.ts`, `runtime/local-voice.ts`). Text/path pins: `test/local-speech-text.test.mjs:13`, `test/local-speech-playback.test.mjs:80`, `test/voice-replies.test.mjs:39,175`, `test/fixtures/cloud-voice-view.mjs:38`, `test/support/feature-parity.mjs:547`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 39 | B3 | `typeof input !== 'string'` on a parameter typed `string` (`screenSpeechText(input: string)`, `planLocalSpeech(input: string, …)`). Callers are typed in-process code. | Drop the `typeof` checks; keep the empty/length checks. | Low; verify no `any`-typed caller passes non-strings (voice-adapter passes agent reply text). |
| 2 | 1 | — | `credentialLike` regex is the single source for both refusal modes; good. | Keep. | — |
| 3 | 45-62 | D8 | 18 chained `.replace` calls; readable enough with comments. | Keep; Prettier will put one per line already. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `credentialLike` | const | 1 | redaction patterns in `scripts/test-local-redaction.ts` target, `crash-log.ts` sanitizers | stays |
| `currency`, `speakNumbers` | const/helper | 18-30 | — | stays |

## Proposed end state
~89 lines; only the two redundant `typeof` checks go. Copy strings unchanged.

## Verification
`test/local-speech-text.test.mjs` (pure algorithm with no other coverage — keep or fold into the voice integration file per T3), voice reply and Listen Playwright journeys.
