# test/agent-model-selection.test.mjs
- Lines: 90 | Kind: tooling integration (spawns real `scripts/start-local-remote.ts` with a fake `bun`, temp profile and git fixture; 11 tests, ~16 spawns) | Verdict: MERGE into `test/tooling/local-agent-launcher.test.mjs` (reduced)
- Covers: the developer launcher (`npm run agent:local`) keeps reviewed model routing, refuses conflicting overrides and half-set redaction swaps before starting a child, preserves the owner token and profile bytes, issues a fresh host revision per launch, ignores caller-supplied native view declarations. Duplicates: launch fixture duplicated in `agent-identity`, `agent-embedding-overrides`. Callers/importers: `npm test` glob; imports `scripts/agent-model.ts`, `scripts/native-view-policy.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-31 | C3 | Third copy of the launch helper. | One shared helper in the merged file. | - |
| 2 | 32-90 | P1 | Each test spawns 1-3 launches with git init; total runtime several seconds. | Keep: conflicting override refused without child; partial redaction swap refused; existing profile bytes and token unchanged; caller-supplied native views ignored. Drop the rest. | Low |
| 3 | 42-44 | - | Asserts "Prepared runtime base commit changed" as the redaction refusal: an unrelated message that happens to fire first. | Use a fixture where the swap check is the first failure, or drop. | Low |
| 4 | 71 | A3 | Uses a `wallet` native view as the injected value (Wallet deleted, D2). | Use any synthetic id. | None |
| 5 | 8 | A7 | `scripts/agent-model.ts` is a 15-line helper (scripts research: merge into `agent-identity.ts`). | Follow scripts chunk. | - |

## Proposed end state
Gone as a file. Four launch cases in `test/tooling/local-agent-launcher.test.mjs`.
