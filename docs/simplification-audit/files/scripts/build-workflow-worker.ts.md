# scripts/build-workflow-worker.ts
- Lines: 22 | Kind: build pipeline step (`npm run agent:build-workflow-worker`, Bun) | Verdict: KEEP + SIMPLIFY (light)
- Covers: produces/reuses the verified workflow-worker dependency artifact and always rebuilds the native Google product host into it. Callers/importers: `package.json` `agent:build-workflow-worker` (in `android:build:local`); `scripts/android-build-preflight.ts` (command hint); test `android-build-path.test.mjs` (T1 on package.json chain); Quint `services/prepared-workflow-worker.mjs:63` (hash input), `services/manifest.json:2973`; `quint-lib.ts`, `source-snapshot.ts`. CI workflows run `agent:prepare` but call this through `android:build:local` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 21 | B5 | Runs `prepare-local-agent.ts --source-only` before and again after the build "to leave the prepared source at the exact pinned commit". If the worker build can dirty the prepared source, the second run is a repair, not a check. | Confirm whether `ensurePreparedWorkflowWorker` mutates the source tree; if not, drop the second call (saves one full source verification). | Low-medium: owner/runtime check. |
| 2 | 11-12 | - | Deletes env variables from `process.env` in-process to match `preparedSourceEnv`. Necessary because the producer runs in-process. Keep. | - | - |
| 3 | 14, 21 | C3 | `process.env.ALPHA_NODE||'node'` duplicated. | One const. | None. |

## Proposed end state
~18 lines; one prepare call if the build does not mutate the source.
