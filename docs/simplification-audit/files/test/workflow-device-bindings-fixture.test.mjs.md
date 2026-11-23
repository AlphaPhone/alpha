# test/workflow-device-bindings-fixture.test.mjs
- Lines: 26 | Kind: test of test machinery (asserts `fixtures/workflow-device-bindings.mjs` installs every name `connection-ui.tsx` imports from `./workflow-presentation`, by regex over the import line) + two real cases through the fixture | Verdict: DELETE
- Covers: the vm harness fixture is complete; protocol 2→3 mapping and the 409 downgrade. Duplicates: `test/workflow-device-registration.test.mjs` (same 409 downgrade table). Callers/importers: `npm test` glob; imports `fixtures/workflow-device-bindings.mjs` (other importers: `test/resident-explicit-panel-startup.test.mjs`, `scripts/test-connection-history.ts`, both transplant harnesses).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-13 | T5/T1 | Tests that a transplant fixture keeps up with `connection-ui.tsx`'s import line. | Delete with the transplant harnesses. | None |
| 2 | 14-26 | T4 | Downgrade cases duplicate `workflow-device-registration.test.mjs`. | Delete. | None |

## Proposed end state
File deleted. `fixtures/workflow-device-bindings.mjs` is deleted when `resident-explicit-panel-startup.test.mjs` and `scripts/test-connection-history.ts` go (both are connection-ui transplants).
