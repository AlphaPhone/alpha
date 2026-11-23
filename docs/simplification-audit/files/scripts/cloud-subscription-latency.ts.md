# scripts/cloud-subscription-latency.ts
- Lines: 94 | Kind: script (one-off network latency probe for issue #410) | Verdict: DELETE
- Covers: times public Cloud subscription endpoints. Callers: none. `grep -r cloud-subscription-latency` outside the file finds nothing (no package.json, workflow, README, test or spec). Duplicates: the `entitlement-keys` reachability is already a gate in `scripts/cloud-readiness.ts:184-189`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Unreferenced one-off measurement tool; output nobody reads. | Delete. Recoverable from git if latency is measured again. | Low |
| 2 | 12-16 | C3 | Yet another hand-written option parser. | Gone with the file. | — |

## Proposed end state
File removed.
