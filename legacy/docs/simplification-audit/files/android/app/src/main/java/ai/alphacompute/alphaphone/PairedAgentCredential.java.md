# android/app/src/main/java/ai/alphacompute/alphaphone/PairedAgentCredential.java
- Lines: 34 | Role: resolves the bearer for a paired (`remote:<origin>`) or Cloud-hosted (`cloud-runtime:<session>`) agent for native speech calls | Verdict: DELETE (owner decision P15)
- Importers: `AlphaVoiceCloudPlugin` (1, paired speech methods). Text/path pins: `specs/quint/refinement/native/note-bridge-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-34 | A3 (P15) | Supports paired remote agents and Cloud-hosted agent runtimes; PRD: "No hosted-agent pairing" (`docs/prd.md:17`), AP-03 "local-only agent, no provisioning/pairing". The renderer writes `cloud-runtime:` only under test mocks (`apps/app/src/runtime/connection-ui.tsx:825`). | Delete with the paired speech methods of `AlphaVoiceCloudPlugin` (`pairedVoiceStatus`, `pairedTranscriptionStatus`, `transcribePairedRecording`, `synthesizePaired`), `PairedSpeechContract`, `apps/app/src/runtime/paired-voice.ts` and `Paired*` instrumentation. If retained as a dev surface, gate behind test mocks end to end. | Medium: owner decision; dev-host speech campaign (`scripts/android-browser-reading-live.ts`) depends on it. |
| 2 | 12, 17, 23 | C3 | Bearer shape check, UUID-v1-5 regex, session id regex inline. | Goes with delete (else `Ids.*`). | — |
| 3 | 26 | C6 | `"cloud:"+environment` slot literal. | Goes with delete. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PairedAgentCredential` | class | 8-34 | `HostedDelivery` remote/cloud credential resolution | deleted |

## Proposed end state
File removed.

## Verification
`npm run verify`; `test/campaign-speech-routes.test.mjs`, `test/paired-speech-contract.test.mjs` removed or updated.
