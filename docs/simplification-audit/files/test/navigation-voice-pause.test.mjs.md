# test/navigation-voice-pause.test.mjs
- Lines: 122 | Kind: transplant (strips imports/exports/types of five files: `.eliza/.../native-speech-request.ts`, `apps/app/src/local-speech-playback.ts`, `apps/app/src/runtime/local-voice.ts`, `.eliza/.../plugin-maps/src/client/navigation-voice.ts`, `apps/app/src/maps/navigation-voice.ts`, and evaluates them in one `vm` with a stub native bridge) | Verdict: REWRITE as cases of `journeys/maps.spec.ts`
- Covers: navigation guidance owed while the screen is off is spoken once on return (latest step only), a cut-off utterance is a pause not a failure, stop/mute drop the owed step, unavailable speech turns guidance off, the Cloud route goes through the app speaker, provider-restricted guidance is never synthesised, and an account change drops owed guidance. Duplicates: `test/navigation-voice.test.mjs` (subset), `test/browser/native-speech.production.spec.ts`, Quint `specs/quint/refinement/services/maps-guidance-voice.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 18-22 | T2 | Five files loaded by text with import lines removed; any new import breaks it. | Rewrite through the real bundle. | Medium: provider-restriction and screen-off rules lose host coverage until the journey exists. |
| 2 | 6-7, 27 | T8 | 20-100 `setTimeout(0)` ticks as settling. | Journey waits on spoken-text conditions. | None |
| 3 | 18, 21 | T5 | Two of the five files are upstream. | Journey tests Alpha's composition only. | None |

## Proposed end state
`journeys/maps.spec.ts` with the native speech fake (`page.addInitScript`) and `document.visibilityState` emulation;
cases: screen-off step spoken once on return (latest only); stop while hidden drops it; speech unavailable turns
guidance off with the message; provider-restricted route never reaches synthesis; account change drops owed guidance.
