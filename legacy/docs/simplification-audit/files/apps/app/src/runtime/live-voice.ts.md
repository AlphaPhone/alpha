# apps/app/src/runtime/live-voice.ts
- Lines: 34 | Role: re-exports 10 functions/constants and 15 types of upstream `packages/voice/src/live-voice-session.ts`; comment says it "adds no behavior of its own". | Verdict: DELETE
- Importers: 1 in src, type-only: `runtime/native-live-voice.ts:5` `import type { LiveVoiceLatency } from './live-voice'`. None of the 10 value exports is imported from this path by src (grep each name). Text/path pins: `test/live-voice.test.mjs:5,8,125`, `test/browser/live-voice.spec.ts:3,18` (imports `/src/runtime/live-voice.ts` in-page, T6), `test/support/feature-parity.mjs:540`; name mentions in `scripts/aggregate-voice-latency.ts`, `scripts/native-voice-latency.ts` and `diagnostics-export.ts:221` are the `'live-voice'` pipeline label, not this path.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-34 | D4 / A7 | Pure re-export shim; one type-only consumer. | Delete; `native-live-voice.ts` imports `LiveVoiceLatency` from the upstream module. Delete or repoint `test/live-voice.test.mjs` and `test/browser/live-voice.spec.ts` first block (they exercise upstream code, T5/T6); drop `feature-parity.mjs:540`. | Low. |
| 2 | 2-8 | A8 | "(#423)" and implementation narrative. | Gone. | — |

## Local types and helpers
None.

## Proposed end state
File removed.

## Verification
`npm run verify` (type-check, feature-parity); `test/browser/live-voice.spec.ts` second block (native-live-voice over a fake bridge) still runs; voice Playwright journeys.
