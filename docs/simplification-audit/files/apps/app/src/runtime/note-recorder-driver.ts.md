# apps/app/src/runtime/note-recorder-driver.ts
- Lines: 95 | Role: Notes recorder driver over the `AlphaVoiceCloud` bridge and the segment transcription route (Cloud with on-device fallback, or on-device). | Verdict: SIMPLIFY
- Importers: `prototype/voice-adapter.ts:45`; `scripts/test-cloud-voice-flow.ts:77` (via fixture).
- Text/path pins: `test/note-recorder-permission-recovery.test.mjs` (reads text), `test/fixtures/cloud-voice-view.mjs/.d.mts`, `test/browser/voice-route-preference.spec.ts`, `specs/quint/legacy/manifest.json`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 84, 89-93 | A4 | `browserDevProfile && selected==='agent'` and the paired-agent branch: `selectVoiceRoute` (`voice-selection.ts:127-134`) never returns `'agent'` (body returns device/manual/cloud only). | Delete L89-93, the `browserDevProfile` clause in L84, and the `createPairedVoice`/`browserDevProfile` imports; narrow `selectVoiceRoute`'s return type. | Low |
| 2 | 16-27 | C2 | Inline `AlphaVoiceCloud` interface (one of 16). | Typed plugin in `native/plugins.ts`. | Low |
| 3 | 50-56 | A8 | Comment still lists "the paired agent" as a route. | Update with #1. | None |
| 4 | 68, 77-78 | B1 | `cloud.cancel(...).catch(()=>{})` (best-effort cancel, keep) and `.catch(()=>false)` on readiness (specified: unavailable). | Keep; comment once. | None |
| 5 | 63 | B1 | `catch(error){throw Object.assign(new Error('Cloud transcription needs sign-in'),{code:'sign-in',cause:error})}` maps every construction failure to sign-in. | Keep only if `createCloudVoice` throws solely for missing sign-in; else check the error code. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| plugin interface | type | 16-27 | `paired-voice.ts:7-17`, `native-reading-voice.ts:7`, `local-speech-playback.ts:7` … | `native/plugins.ts` |
| `silence` | helper | 48 | no-speech detection in `voice-adapter.ts` (check) | keep |

## Proposed end state
~80 lines: typed plugin, driver, transcriber with two routes (cloud→device fallback, device). No paired branch.

## Verification
`test/note-recorder-permission-recovery.test.mjs`, `scripts/test-cloud-voice-flow.ts`, `test/browser/voice-route-preference.spec.ts`, `test/voice-selection.test.mjs` (asserts on `'agent'` mapping).
