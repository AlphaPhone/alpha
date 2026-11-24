# apps/app/src/runtime/development-cartesia-flag.ts
- Lines: 3 | Role: derives `developmentCartesiaVoiceEnabled` from `import.meta.env` and build flags. | Verdict: MERGE into apps/app/src/build-flags.ts
- Importers: 4 product (`prototype/local-speech-playback.ts`, `runtime/cloud-voice.ts`, `runtime/development-cartesia-conversation.ts` (+ re-export), `runtime/local-agent.ts`); via the re-export also `prototype/voice-adapter.ts`, `prototype/settings-adapter.ts`. Text/path pins: `test/development-cartesia-conversation.test.mjs`, `test/private-preview-cartesia-route.test.mjs`, `test/voice-progress-state-forwarding.test.mjs`, `test/voice-request-provenance.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D5 | One of ~10 separately derived dev flags: `import.meta.env.DEV===true&&(devSurfacesEnabled||privateLocalPreviewEnabled)&&!Capacitor.isNativePlatform()&&import.meta.env.VITE_ALPHA_DEV_CARTESIA==='1'`. | Move the expression into `build-flags.ts` beside `devSurfacesEnabled`; delete this file; update 6 importers and the tests that read it. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `developmentCartesiaVoiceEnabled` | const | 3 | sibling flags in `development-cloud-voice.ts`, `browser-cloud-resident.ts`, `local-agent.ts:69-72` | `build-flags.ts` |

## Proposed end state
File deleted; flag lives in `build-flags.ts`.

## Verification
The four voice tests above, `test/dev-surface-gates.test.mjs`, production bundle audit.
