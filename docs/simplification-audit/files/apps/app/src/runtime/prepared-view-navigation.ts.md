# apps/app/src/runtime/prepared-view-navigation.ts
- Lines: 9 | Role: admits only the owner-scoped "prepare navigation" request shape across the bridge. | Verdict: KEEP (minor)
- Importers: `runtime/local-agent.ts:1`, `runtime/development-cloud-agents.ts:1`, `runtime/remote-protocol.ts:1`, `scripts/local-agent-dev-bridge.ts:1`.
- Text/path pins: `test/prepared-navigation-route.test.mjs` (reads text), `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 7-8 | D8 | `/^\/api\/views\/[A-Za-z0-9_-]+\/navigate$/.exec(path)?.[0] !== path` — the pattern is anchored, so `.test(path)` is equivalent; same for the two id patterns. | Use `.test`. | None |
| 2 | 5 | D8 | key check via `length===5 && every(includes)`. | `const KEYS=[…]`; compare sorted keys. | None |

## Local types and helpers
None.

## Proposed end state
~9 lines, simpler predicates.

## Verification
`test/prepared-navigation-route.test.mjs`, local-agent view navigation tests.
