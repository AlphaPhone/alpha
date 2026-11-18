# apps/app/src/runtime/development-cloud-voice.ts
- Lines: 8 | Role: two dev-only flags for browser Cloud speech and Cloud realtime speech. | Verdict: MERGE into apps/app/src/build-flags.ts
- Importers: 6 product (`prototype/local-speech-playback.ts`, `prototype/voice-adapter.ts`, `runtime/cloud-voice.ts`, `runtime/development-cartesia-conversation.ts`, `runtime/local-agent.ts`, `runtime/note-recorder-driver.ts`). Text/path pins: `test/browser/browser-cloud-dev.spec.ts`, `test/cloud-resident-authority.test.mjs`, `test/development-cloud-voice.test.mjs`, `test/voice-progress-state-forwarding.test.mjs`, `test/voice-request-provenance.test.mjs`, `test/fixtures/cloud-voice-view.mjs`, `specs/quint/refinement/native/speech-cleanup-latch.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5, 8 | D7 | `import.meta.env!==undefined&&…` shim; the comment says it "keeps Node-only protocol consumers inert", i.e. exists for Node unit tests. | Remove with those tests (T2/T3); in Vite `import.meta.env` is always defined. | Low |
| 2 | 5, 8 | D5 | Reads `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` directly instead of `testMocksEnabled` from `build-flags.ts`. | Use `testMocksEnabled`; move both flags into `build-flags.ts`; delete file. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `developmentCloudVoiceEnabled` | const | 5 | dev-flag siblings | `build-flags.ts` |
| `developmentCloudRealtimeVoiceEnabled` | const | 8 | dev-flag siblings | `build-flags.ts` |

## Proposed end state
File deleted; two flags in `build-flags.ts` built from `testMocksEnabled`, `browserCloudResidentEnabled` and the two `VITE_ALPHA_DEV_*` variables.

## Verification
`test/development-cloud-voice.test.mjs`, `test/browser/browser-cloud-dev.spec.ts`, `test/dev-surface-gates.test.mjs`, bundle audit.
