# apps/app/src/runtime/voice-states.ts
- Lines: 59 | Role: pure recorder helpers — failure classification with user copy (`voiceFailure`), the denied-microphone "Open app settings" rule (`deniedSettingsChoice`, Lemma-verified), and transcript provenance. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `browser/speech-errors.ts`, `prototype/voice-adapter.ts`, `runtime/note-recorder-driver.ts`. Tests: `voice-calm-cloud-errors.test.mjs`, `voice-denied-recovery.test.mjs`, `voice-start-failure-copy.test.mjs`, `fixtures/cloud-voice-view.mjs`, Playwright `browser-speech.spec.ts`.
- Text/path pins: `LemmaScript-files.txt` (lists this file); `specs/lemma/apps/app/src/runtime/voice-states.dfy` and `.dfy.gen` generated from the `//@` annotations at 44-47 (any edit to `deniedSettingsChoice` or `DeniedSettingsInput` needs regeneration); `specs/lemma/README.md`; `specs/quint/native/manifest.json` (path); `test/voice-denied-recovery.test.mjs:3` reads the source text (T1/T2); `test/support/feature-parity.mjs:619`. User-visible copy at 17-32 is pinned by the copy tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 11-12 | C3 | `type Reason = {name?;code?}` + `typeof value?.name === 'string' ? … : ''` — same extraction as `voice-selection.ts:76-78`, `browser/speech-errors.ts`. | Use shared `errorCode(reason)` from `apps/app/src/lib/parse.ts`. | Low. |
| 2 | 55 | C6 | Provenance route names `'eliza-cloud'`, `'paired-agent'`, `'on-device'`, `'browser'`, `'development-agent'` duplicate `voiceTimingRoutes` in `voice-timing.ts:43`. | Export one `VOICE_ROUTES` const (with a `VoiceRoute` union) from voice-timing (or here) and type `TranscriptProvenance.route` with it. | Low; diagnostics-export.test regexes `const voiceTimingRoutes[^=]*= [...]` out of voice-timing — move that test to an import first. |
| 3 | 15, 19 | D9 | Long OR chains of DOMException names. | `const DENIED = new Set([...])`, `const NO_MIC = new Set([...])`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Reason` | type | 4 | `voice-selection.ts:76` inline row type | `apps/app/src/lib/parse.ts` `errorCode` |
| `field` | helper | 51 | bounded-string guards in many protocol files | stays (local, 1 line) |
| `VoiceFailure`, `TranscriptProvenance`, `DeniedSettingsInput`, `DENIED_SETTINGS_LABEL` | type/const | 2-3, 41-42 | none | stays |

## Proposed end state
Unchanged structure, ~55 lines: shared error-code helper, named sets for the DOMException names, route names typed from the single route list. Lemma block untouched.

## Verification
`node --test test/voice-calm-cloud-errors.test.mjs test/voice-denied-recovery.test.mjs test/voice-start-failure-copy.test.mjs`; LemmaScript/Dafny check for `voice-states.dfy`; Playwright `browser-speech.spec.ts`.
