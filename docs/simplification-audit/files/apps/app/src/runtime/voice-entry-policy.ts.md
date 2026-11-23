# apps/app/src/runtime/voice-entry-policy.ts
- Lines: 2 | Role: constant switch `externalVoiceInvocationEnabled = false` (P-78: voice is entered from the conversation only). | Verdict: DELETE with the dormant code it guards (A4) — pending owner confirmation (P-78 says "keep dormant")
- Importers: `main.tsx` (gates `installListenerInvocation`), `prototype/model.js:2`, `prototype/settings-adapter.ts:1`, `runtime/always-on-listener.ts:1`. Tests/specs: `test/voice-in-chat-only.test.mjs`, `test/comms-settings.test.mjs`, `test/quint-settings-capability-reads.test.mjs`, `specs/quint/refinement/application/shell-core-fixture.mjs` (inject the flag).
- Text/path pins: `test/support/feature-parity.mjs:617` (exact inventory).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | A4 | `export const externalVoiceInvocationEnabled = false;` keeps unreachable code compiled: `main.tsx:430` listener-invocation branch, the invocation path of `runtime/always-on-listener.ts`, `prototype/model.js:5441` and the settings-adapter branch. | Owner decision: if P-78 dormancy is not a planned feature, delete this file, the `true` side at every importer and the listener-invocation path; record in DECISIONS.md otherwise. | Medium: four importers and three tests change together; the false side must stay exactly as it behaves now. |
| 2 | 1 | A8 | Comment is a decision reference only. | Goes with the file. | — |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines) together with the dead `true` branches; or unchanged (2 lines) and listed in DECISIONS.md as a deliberately dormant feature.

## Verification
`node --test test/voice-in-chat-only.test.mjs test/comms-settings.test.mjs test/quint-settings-capability-reads.test.mjs`; Quint application shell-core replay; feature-parity inventory; `scripts/audit-production-bundle.ts` (dead code must not be in the bundle).
