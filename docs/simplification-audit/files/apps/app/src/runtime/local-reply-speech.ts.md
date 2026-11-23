# apps/app/src/runtime/local-reply-speech.ts
- Lines: 121 | Role: pipelined on-device playback of a spoken conversation reply, one sentence per native `synthesizeLocal(append)` call, settling each sentence on the next segment start or utterance end; plus `openMicrophoneAvailable()`. | Verdict: SIMPLIFY
- Importers: 1 (`prototype/voice-adapter.ts:36`, uses `createLocalReplySpeaker`, `openMicrophoneAvailable`). Text/path pins: `test/local-reply-speech.test.mjs:7` (stub bridge incl. `holdSpeechEngine`), `test/browser/voice-assistant-fixture.ts:64` (lists `holdSpeechEngine`/`releaseSpeechEngineHold` as no-op fake methods), `test/support/feature-parity.mjs:40,546`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-20, 108-109, 115 | A7 / B2 / B1 | `holdSpeechEngine?()` / `releaseSpeechEngineHold?()` and `hold() { try { void Promise.resolve(bridge.holdSpeechEngine?.()).catch(() => {}); } catch { /* An older bridge has no hold. */ } }`. Neither method exists in any Java plugin (grep `android/`: 0 hits) nor in the browser voice fake beyond a no-op; on device the Capacitor proxy rejects "not implemented" and the catch swallows it. The feature does nothing. | Delete both members, `hold()`, the hold-release line in `release()`, and the `replySpeech?.hold()` call at `prototype/voice-adapter.ts:859`. Remove them from the two test fakes. | None (no-op today). |
| 2 | 121 | D4 | `export function openMicrophoneAvailable(): boolean { return Capacitor.isNativePlatform(); }` — one caller. | Inline `Capacitor.isNativePlatform()` (or `isAndroid`) at `voice-adapter.ts:774` with the comment. | None. |
| 3 | 13-21, 25 | C2 | Local `Bridge` type + `registerPlugin<Bridge>('AlphaVoiceCloud')` — `AlphaVoiceCloud` is typed separately in 17 places (cloud-voice.ts:102, local-voice.ts:7-15, native-live-voice.ts:15, native-reading-voice.ts:7 (`any`), native-voice-turn.ts:12, note-recorder-driver.ts:27, paired-voice.ts:17, voice-adapter.ts:76, local-speech-playback.ts:58 (`any`), startup-permissions.tsx:21, …). | One `runtime/voice-plugin.ts` with the full `AlphaVoiceCloudPlugin` interface and proxy; this file takes `Pick<…>`. | Low. |
| 4 | 39-45 | D8 | `setTimeout(...,Math.max(0,Math.min(10_000,Number(value.atMs)-Date.now()||0)))` dense. | Name `const delay = clamp(Number(value.atMs) - Date.now() || 0, 0, 10_000)`. | None. |
| 5 | 96-97 | B1 | Cleanup failure is converted to a coded error (`speech-cleanup-unconfirmed`) — specified, keep. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bridge` | type | 13-21 | 16 other `AlphaVoiceCloud` typings | `runtime/voice-plugin.ts` |
| `Sentence` | type | 22 | — | local |
| `SENTENCE_LIMIT_MS` | const | 23 | — | local |

## Proposed end state
~105 lines: no hold/release-hold feature, typed via the shared voice plugin interface, `openMicrophoneAvailable` inlined at its caller. Sentence pipelining and cleanup semantics unchanged.

## Verification
Voice conversation Playwright journeys (`voice-assistant-fixture.ts` users), on-device spoken reply on Android (`npm run android:build:local`); delete or update `test/local-reply-speech.test.mjs` (T3).
