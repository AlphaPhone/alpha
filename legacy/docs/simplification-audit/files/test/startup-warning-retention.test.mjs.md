# test/startup-warning-retention.test.mjs
- Lines: 23 | Kind: transplant (slices a JSX `ref={(value: any) => { shell = value;` callback and the `stopWakeListenerForChatOnly().then(` body out of `apps/app/src/main.tsx`, evals in `vm`) + source-text | Verdict: DELETE
- Covers: The "Wake listening could not be confirmed off" warning is shown exactly once on the live shell even when it arrives before mount or across remounts. Duplicates: none. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T2 | Text cut points inside `main.tsx` composition code; the planned `main.tsx` split breaks it. | Delete. | Low |
| 2 | 22 | T1 | Asserts the slices do not mention `stopWakeListener`/`startListening`. | Delete. | Low |

## Proposed end state
File deleted. If kept, one case in `journeys/voice.spec.ts`: native fake reports the wake listener could not be stopped at startup;
the toast appears once.
