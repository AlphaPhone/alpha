# scripts/start-reviewed-workflow-agent.ts
- Lines: 64 | Kind: development launcher | Verdict: MERGE into `start-local-remote.ts` (flags), then delete
- Covers: launches the dev-server for the workflow host scripts (default profile `local-reviewed-workflows`, port 47848; others pass `--profile/--port`), supervised via `launcher-child.ts`. Duplicates: `start-local-remote.ts` (same config, model, identity, embeddings). Callers: started by hand before `scripts/test-reviewed-workflow-host.ts`, `test-workflow-cancel-recovery.ts` (they use port 47848) and the approvals/lifecycle host scripts (comment 4-8); listed in `quint-lib.ts:15`; Quint `reviewed-workflow-launcher.mjs:22`, `reviewed-workflow-launcher-probe.mjs:12` (copies and runs it), `ReviewedWorkflowLauncher.qnt`, `services/manifest.json:2134`; tests `agent-identity.test.mjs:87`, `agent-embedding-overrides.test.mjs:87`, `core-state-patch.test.mjs:108` (T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 | Same launch as `start-local-remote.ts` minus redaction/Cartesia/speech; only the defaults and the flag interface differ. | After `start-local-remote.ts` takes `--source/--profile/--port/--bun` and supervises its child, delete this file; the workflow host scripts document `npm run agent:local -- --profile … --port 47848`. | Medium: the ReviewedWorkflowLauncher Quint model must retarget the merged launcher and keep 100 % (D11); do both in one change. |
| 2 | 4-8 | A8 | Comment lists which test scripts use which profile/port. | Move the port/profile to each workflow host script's own header (they own the requirement). | — |
| 3 | 33-45 | C5 | Token/config creation duplicated (`preparePrivateRuntimeProfile` exists and is unused here). | Gone with the merge. | — |

## Proposed end state
Deleted; one local launcher with flags. Quint ReviewedWorkflowLauncher probe runs the merged launcher
with `--profile/--port/--source/--bun`.
