# test/sign-in-incomplete-queue.test.mjs
- Lines: 98 | Kind: transplant (two text slices of `connection-ui.tsx` between a JSDoc sentence and `function runQueuedResidentRebind(`, and between `signInIncomplete(value: unknown) {` and a comment) | Verdict: REWRITE as `journeys/connection-cloud.spec.ts` cases
- Covers: A native "sign-in incomplete" return that arrives during startup waits for startup, then shows "Sign in again" once; storage refusal keeps its own message and never overrides a newer step or connection. Duplicates: none found in `test/browser` for `signInIncomplete` delivery during startup. Callers/importers: `npm test` glob only; uses strip-types.mjs (`test/support/strip-types.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | T2 | Cut points are prose comments; any comment edit breaks it. | Delete. | Low |
| 2 | 18-23 | T3 | Box of fake `operation`, `epoch`, `update`. | Delete. | Low |
| 3 | 26-46 | T2 | Startup-time delivery is the shipped bug fix (F02). | Carry: native fake emits `signInIncomplete` before the startup probe resolves; after startup the panel shows "Sign in again" once. | Med |
| 4 | 66-98 | T3 | Storage-refusal staleness cases. | Carry one: storage refusal shows its specific message after startup. | Low |

## Proposed end state
File deleted. Two cases in `journeys/connection-cloud.spec.ts` using the native Cloud sign-in fake (`native-cloud-signin.spec.ts` helper).
