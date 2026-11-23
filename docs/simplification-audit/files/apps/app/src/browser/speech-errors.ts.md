# apps/app/src/browser/speech-errors.ts
- Lines: 17 | Role: typed error/cancel constructors for browser speech | Verdict: KEEP
- Importers: 1 (voice.ts). Text/path pins: test/browser-voice-cancellation.test.mjs (reads source); test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | A7 | `export type SpeechErrorCode` — no importer outside (git grep -w: 0). | Unexport, or have runtime/voice-states.ts import it instead of re-listing codes. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Unchanged. Estimated lines after: 17 (current 17).

## Verification
test/browser-voice-cancellation.test.mjs.
