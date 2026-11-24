# apps/app/src/browser/workflow-speech.ts
- Lines: 11 | Role: dev workflow simulator — re-exports `speakAppText` as `speakWorkflowText` and waits for a simulated phone pickup | Verdict: MERGE into `browser/simulated-workflows.ts` (then delete file)
- Importers: 1 — `browser/simulated-workflows.ts:14` (the `workflow-speech` hits in agent-adapter/workflow-adapter are the unrelated event name `alpha:stop-workflow-speech`). Text/path pins: `test/support/feature-parity.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 | `export {speakAppText as speakWorkflowText} from '../runtime/app-speech'` alias rename | import `speakAppText` directly in simulated-workflows.ts | none |
| 2 | 8 | C3 / P5 | inline `document.hidden||…devBackground==='true'||Array.from(document.querySelectorAll('[aria-label="Unlock with fingerprint"], [aria-label="Wake"]'))…` — the `browserScreenLocked`/`noticeActionBlocked` predicate re-spelled | `if(noticeActionBlocked())return;` | none |
| 3 | file | D4 / C5 | 11-line single-caller module | move `waitForWorkflowPickup` (6 lines) into simulated-workflows.ts | feature-parity list edit |

## Local types and helpers
None.

## Proposed end state
File deleted; ~6 lines in simulated-workflows.ts.

## Verification
`test/browser/dev-workflow-automatic-speech.spec.ts` (pickup then speak).
