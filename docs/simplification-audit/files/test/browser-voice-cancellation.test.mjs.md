# test/browser-voice-cancellation.test.mjs
- Lines: 72 | Kind: transplant (T2; whole `browser/voice.ts` and `browser/speech-errors.ts`, imports stripped by regex, `import.meta.env.DEV`→`true`, run by `new Function` with 24 positional injected dependencies) | Verdict: DELETE; REWRITE as cases in `test/browser/journeys/voice.spec.ts`
- Covers: a readiness check never cancels in-flight STT/TTS; only a newer request of the same kind supersedes; targeted cancel stops only its request; stop/release/hide/pagehide/device-state cancel all with named reasons; a prepared development-Cloud clip still downloading is cancelled by those triggers. Duplicates: `browser-streamed-speech.test.mjs` (same compile approach), Playwright `voice-preparation-ownership.spec.ts`, `voice-stop-speaking.spec.ts`, `dev-speech-account-switch.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 25-26 | T2 | 24 positional parameters must match the module's import names; adding an import silently passes `undefined` (or `unexpected`). | Delete. | none |
| 2 | 9 | B2 in test | `typeof speechCancelled==="function"?...:undefined`: tolerates the export being absent. | Gone. | none |
| 3 | 53, 61 | P8 | Asserts exact `console.warn` payloads (`['[Alpha speech]',{kind,reason}]`): logging shape. | Drop in the journey. | none |
| 4 | 34-48 | — | "readiness check does not cancel in-flight speech" and "transcription in flight makes queued speech busy": user-visible races. | Carry. | none |
| 5 | 64-72 | D5 | `synthesizeDevelopmentCloud`: dev-only path (DEV=true). | Keep only while D19 keeps the dev Cloud speech surface. | low |

## Proposed end state
Delete. Journey cases (dev local agent that holds requests until released): opening the voice panel (readiness check) while a reply is being spoken does not stop it; switching away from the app (visibility hidden) stops both an in-flight transcription and speech and no transcript/speech appears afterwards; a second dictation supersedes the first and only the second transcript is shown.
