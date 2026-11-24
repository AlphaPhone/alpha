# test/native-enrollment-commit-order.test.mjs
- Lines: 34 | Kind: transplant (slices `connection-ui.tsx` between two literal statements, strips types, evals with `new Function`) | Verdict: DELETE
- Covers: resident device enrollment wakes the native notification path only after the credential slot write commits, refuses a changed committed identity, and never wakes on failure/abort or in the browser. Duplicates: none found. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | T2 | Cuts `connection-ui.tsx` (one of the 81 slicers of this god module) at `credential.enrollmentId=registered.enrollmentId;await store.write(slot,credential);`; blocks the D1 split of `connection-ui.tsx`. | Delete. | Medium |
| 2 | 17-34 | - | Commit-before-wake ordering has no other coverage. | Coverage at risk: when enrollment moves to its own module in the stage F split, export the step and test it once in `test/integration/connection-cloud.test.mjs` with a real slot store; until then accept the gap (owner question). | Medium |

## Proposed end state
File deleted; ordering re-tested through a real import after the `connection-ui` split.
