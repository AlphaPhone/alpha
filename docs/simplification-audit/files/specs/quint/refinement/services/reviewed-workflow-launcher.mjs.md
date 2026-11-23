# specs/quint/refinement/services/reviewed-workflow-launcher.mjs
- Lines: 71 | Kind: Quint refinement wrapper (spawns the probe per scenario in an isolated scratch HOME; optional real-Bun scenarios) | Verdict: KEEP while `start-reviewed-workflow-agent.ts` exists; otherwise DELETE with it (owner)
- Covers: `ReviewedWorkflowLauncher` (live, `manifest.json:2106`) for the developer launcher `scripts/start-reviewed-workflow-agent.ts` (no npm/CI caller; started by hand for the `scripts/test-*workflow*` host probes, which `scripts.md` lists as likely deletable). Duplicates: `combined-agent-launcher.mjs` covers the shared `launcher-child.ts` supervisor (escalation); this harness repeats supervision checks for a second launcher. Callers: `services/index.mjs:46,80`; `test/quint-reviewed-workflow-launcher-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | A7 / D20 (owner) | Models a developer-only launcher whose script report says MERGE into `start-local-remote.ts` and delete; its only users are manual workflow host probes also proposed for deletion. A model of deleted code is not live (D20). | Owner decision bundled with the script: delete `ReviewedWorkflowLauncher.qnt`, this wrapper, the probe and both `.md` files, or re-point at the merged launcher. The shared supervisor stays covered by `combined-agent-launcher.mjs`. | Medium |
| 2 | 19-33 | B5 | Input list reads `upstream-core-sources.ts` policy and pins 20+ paths for the receipt. | Shrinks with receipts. | Low |
| 3 | 35-56 | C3 | Isolated-spawn block duplicated with `native-google-host-artifact.mjs:13-31`. | Shared helper. | Low |
| 4 | 62-63 | — | Real-Bun scenarios gated on a caller-supplied path. | Keep if kept. | — |

## Proposed end state
Deleted together with the launcher, or unchanged on a shared spawn helper if the launcher stays.
