# test/workflow-definition-bounds.test.mjs
- Lines: 142 | Kind: integration of real protocol modules (`runtime/workflow-protocol.ts`, `runtime/phone-workflow-authoring.ts`, `runtime/workflow-device-contract.ts`, `prototype/locale-time.ts`) behind a synthetic agent request function, but each test runs as a `node --import=tsx -e` program string | Verdict: MERGE into `test/integration/workflows-protocol.test.mjs`
- Covers: MVP-32 generation bounds (trigger, operations, step count, size, digest/catalog/compiler, enrollment); typed trigger normalisation (manual or reviewed local time) and capability check; tolerant listing of untyped/unreadable definitions; resubmission under the retained identity; typed save refusal mapping. Duplicates: `test/browser/workflow-generation.spec.ts`, `dev-workflow-authoring.spec.ts` (UI side), `test/workflow-typed-schedule.test.mjs` (same prelude). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-21 | T9/C5 | Program-in-a-string; the `prelude` is copied in `workflow-output-contract`, `workflow-typed-schedule`. Assertions run in the parent on JSON, so failures lose stack and line. | One integration file importing the modules directly. | Low |
| 2 | 23-65 | keep | Generation bound checks are the protocol trust boundary (agent output). | Carry: added schedule, unoffered operation, >32 steps, oversized, digest/catalog/compiler mismatch, changed enrollment, prompt length, clarification passthrough. | Low |
| 3 | 67-89 | keep | Trigger normalisation and DST description. `legacyTime {kind:'time',t:7}` is an old trigger shape refused as unsupported (behaviour, not a reader). | Carry. | Low |
| 4 | 106-126 | owner | `mode==='legacy'`: an agent without `manualSubmissionProtocol`. Compatibility with older agents is a protocol decision, not app data (not A1). | Keep the refusal case; owner question whether pre-protocol agents still need a message. | Low |
| 5 | 10 | T8 | 120 s timeout per child; four tsx cold starts per run. | Removed by direct import. | None |

## Proposed end state
Deleted as a file. `test/integration/workflows-protocol.test.mjs` (one tsx-loaded file for `workflow-protocol`, `phone-workflow-authoring`, `workflow-device-contract`, `workflow-presentation`, `workflow-reminder-read`) holds four describe blocks taken from here: generation bounds, trigger rules, listing tolerance, resubmission/typed-save refusal.
