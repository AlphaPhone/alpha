# apps/app/src/browser/workflow-resources.ts
- Lines: 5 | Role: dev workflow simulator — Web Locks wrapper serialising one named destination (`notes`/`agent`/`speech`) | Verdict: MERGE into `browser/simulated-workflows.ts` (only importer)
- Importers: 1 — `browser/simulated-workflows.ts:4`. Text/path pins: `test/support/feature-parity.mjs` only. Lock names `alpha.dev.workflow-resource.<r>` (runtime only, not persisted).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | D4 / research P10 | 5-line single-caller module | Inline as a local function in simulated-workflows.ts | feature-parity list edit |
| 2 | 3-4 | B3 | `signal.throwIfAborted()` before `navigator.locks.request(…,{signal})` and again inside — `locks.request` already rejects on an aborted signal | keep only the inner check (lock may be granted after abort race) | none |

## Local types and helpers
None.

## Proposed end state
File deleted; 3 lines inside simulated-workflows.ts.

## Verification
Dev workflow specs that run concurrent notes/agent/speech steps (`test/browser/dev-workflow-executor.spec.ts`).
