# test/provider-key-release-drain.test.mjs
- Lines: 79 | Kind: transplant (four marker slices of `connection-ui.tsx`, including a fake `connectionController` built from two method-body slices, evaluated in `vm`) | Verdict: DELETE; one case to `journeys/connection-cloud.spec.ts`
- Covers: a sign-in return, incomplete-sign-in notice or plan rebind that arrives while a key reveal/edit/remove holds the connection operation slot is serviced when the key request ends (success or failure). Duplicates: none direct; queued sign-in returns are also driven by `connection-*` transplant tests. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-18 | T2 | Builds a synthetic `connectionController` by splicing `'    if (operation) { queuedSignInReturn = value; return; }'` … `'    if (outcome.status ==='` into an object literal. Breaks on any reformat (D9 Prettier commit). | Delete. | Medium |
| 2 | 41-73 | T2 | The queue-drain rule is real (a lost sign-in return leaves the user stuck). Only covered here. | One journey case: start a key edit with the native/Cloud mock held, deliver a sign-in return, release, expect the signed-in state. | Medium |
| 3 | 75-79 | B4 | "nothing queued runs nothing" asserts fakes were not called. | Delete. | Low |

## Proposed end state
File deleted. `journeys/connection-cloud.spec.ts` gains "a sign-in return during a key edit is handled when the edit
ends". If the connection controller is split into modules (D1), an integration test on the real queue module is the
better home.
