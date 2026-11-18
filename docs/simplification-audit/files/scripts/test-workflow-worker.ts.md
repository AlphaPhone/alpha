# scripts/test-workflow-worker.ts
- Lines: 108 | Kind: integration (runs the staged workflow-worker artifact's real `smthrs`/`effect` packages under `bun --no-install` in an isolated copy) | Verdict: MOVE to `test/workflow-worker-artifact.test.ts` (keep `npm run agent:test-workflow-worker` and the `resident-android.yml` step pointing at it)
- Covers: the packaged worker artifact runs a workflow exactly once across restarts, approval/deny/cancel/signal controls survive a restart and gate the guarded task, and a large signal payload is delivered once. Duplicates: none found (`test/workflow-worker-assets.test.mjs` checks staging, not execution). Callers: `package.json:41` `agent:test-workflow-worker`; `.github/workflows/resident-android.yml:314` (via `resident-phase.py`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A test living in `scripts/` with top-level asserts. | Move to `test/` as `node:test` with one `test()` per control (approve/deny/cancel/signal) and one for once-only execution; mark it as needing the prepared artifact + Bun (skip with a clear reason otherwise, not silently). | Low |
| 2 | 12 | B3 | Re-checks dependency provenance names that `verifyWorkerArtifact` (line 10, plus `workflow-worker-artifact.ts:46`) already requires for 4 of the 6. | Keep only the two names `verifyWorkerArtifact` does not check (`react`, `drizzle-orm`) or move them into `verifyWorkerArtifact`'s required list. | Low |
| 3 | 28 | B2 | `typeof value!=='function'` check of upstream control exports inside the generated script; the imports would already fail if missing in ESM. | Drop. | Low |
| 4 | 107 | B5 | Prints an evidence JSON with `nativeAcceptance:false`; nothing consumes it. | Drop; the test result is the evidence. | None |
| 5 | 36 | C3 | `process.env.ALPHA_BUN||'bun'` resolution repeated in `cloud-resident-host.ts:140`, `native-google-host-artifact.ts:122`, `prepare-local-agent.ts:72` (CI exports `ALPHA_BUN` in `android.yml:72`, `browser.yml:63`). | One `bunCommand()` in `scripts/lib/`. | Low |

## Proposed end state
`test/workflow-worker-artifact.test.ts` with ~5 named cases, same fixtures written into a temp dir, same Bun invocation. The npm alias and the CI step call the test file. Runtime cost: ~12 Bun process launches, each up to 60 s timeout; it belongs in the resident Android lane, not the default host test run.
