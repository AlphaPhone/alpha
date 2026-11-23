# apps/app/src/browser/audio-levels.ts
- Lines: 24 | Role: AnalyserNode meter per recording: bar levels for the UI and peak/RMS metrics. | Verdict: KEEP
- Importers: 2 (`browser/audio-capture.ts:1`, `prototype/voice-adapter.ts`). Text/path pins: `test/browser/voice-levels.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 15 | C6 | Bar count `44` written four times (`Array.from({length:44}…)`, `/44`, `*44`). | `const BARS=44`. | None |
| 2 | 6 | B1 | `void context.close().catch(()=>{})` — closing a context during teardown; failure has no consequence. | Keep (specified teardown). | — |

## Local types and helpers
None with twins.

## Proposed end state
Same file, one named constant. Do not merge with `audio-settings.ts` (unrelated concern despite the research suggestion).

## Verification
`test/browser/voice-levels.spec.ts`.
