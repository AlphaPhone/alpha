# test/offline-signed-out-speech.test.mjs
- Lines: 111 | Kind: transplant (type-strips `runtime/voice-selection.ts` and `local-speech-playback.ts` with imports/exports regex-removed and runs them in `vm` with a fake offline network and fake `AlphaVoiceCloud` plugin) + unit (lines 81-111 import the real `runtime/voice-timing.ts` with a global `localStorage` shim) | Verdict: REWRITE as `journeys/voice.spec.ts` (offline + signed-out) and DELETE the rest
- Covers: signed out and offline, voice routing stays on device and makes no network request; replies are synthesised sentence by sentence on device; a phone call stopping speech surfaces "Speech stopped for a phone call."; voice timing stage marks reach the native sink with one linked turn id. Duplicates: `test/browser/browser-speech.spec.ts`, `note-read-aloud.spec.ts`, `test/android-cloud-voice-timing.test.mjs` (timing), `test/agent-speech-environment.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 25, 53 | T2 | `strip()` regex-removes imports/exports and re-exposes chosen symbols through `globalThis.api`. | Delete. | None |
| 2 | 28 | A1 / A4 | Loops `selectVoiceRoute` over `'agent'`, the impossible voice route DECISIONS D8 deletes, and a stored Cloud choice. | Delete; the route union shrinks in Stage C. | None |
| 3 | 16-30, 57-71 | - | Offline + signed out: speaking a reply makes zero network requests and uses on-device synthesis. | Journey: `context.setOffline(true)`, signed-out dev profile, ask for a spoken reply, assert no request leaves the page (`page.on('request')`) and the native speech mock received sentence chunks. | Medium (needs the typed Capacitor bridge fake) |
| 4 | 73-79 | - | Call interruption message. | Carry as one journey assertion (bridge emits `playbackStopped` with `call-active`, status line reads "Speech stopped for a phone call."). | Low |
| 5 | 81-111 | T3, T4 | `voice-timing.ts` unit with a global `localStorage` shim mutated for the process; timing sink overlaps `android-cloud-voice-timing.test.mjs`. | Delete; keep timing coverage in one place (the Android timing test or the voice journey's exported timing record). | Low |
| 6 | 7 | A8 | "Issue #397" reference. | Gone. | None |

## Proposed end state
Deleted. `journeys/voice.spec.ts` gains an "offline and signed out" case: no network request, on-device synthesis per sentence, and the phone-call interruption status. Voice timing stays covered by one test elsewhere.
