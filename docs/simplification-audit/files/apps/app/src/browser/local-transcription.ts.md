# apps/app/src/browser/local-transcription.ts
- Lines: 15 | Role: browser speech status/transcription delegated to an explicitly selected development agent | Verdict: SIMPLIFY
- Importers: 1 (voice.ts). Text/path pins: test/browser-local-transcription.test.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 11, 12 | C3 | `if(selected()!==agent\|\|agent.session!==session)throw new DOMException('Voice selection changed','AbortError')` written 3×. | Local `const still=()=>{signal.throwIfAborted();if(...)throw ...}`. | None. |
| 2 | 2 | A7 | `BROWSER_ASR_UNAVAILABLE` exported, no importer outside this file (git grep -w: 0 in apps/test/specs). | Unexport. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Agent | type | 3 | voice.ts selected-agent shape | stay |

## Proposed end state
Same two functions with one staleness helper; constant unexported. Estimated lines after: 12 (current 15).

## Verification
test/browser-local-transcription.test.mjs, browser voice specs.
