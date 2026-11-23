# scripts/start-cloud-qa.ts
- Lines: 53 | Kind: development launcher (staging Cloud inference QA) | Verdict: KEEP pending owner (live Quint model), SIMPLIFY
- Covers: launches the pinned Eliza dev-server in an isolated owner-only profile routed to staging Cloud inference with a key from an owner-only file; refuses reuse of non-QA profiles and protected ports. Duplicates: launcher skeleton shared with `start-local-remote.ts` (profile/token/config/env/log/process.json). Callers: no npm script/workflow/doc; listed in `quint-lib.ts:16`; Quint `specs/quint/refinement/services/cloud-qa-launcher.mjs:43`, `cloud-qa-launcher-probe.mjs:14` (copies and runs it: integration, not text slicing), `specs/quint/services/manifest.json:2480`; tests `cloud-qa-launcher.test.mjs` (imports `cloudQaConfiguration`), `cloud-deployment.test.mjs:142` and `core-state-patch.test.mjs:108` (T1 text regex).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 (question) | No human-facing entry point (no npm script, no README). It is a dev tool with a live model (CloudQaLauncher). D20: keep code and model together or delete both. | Owner question: if staging Cloud QA is still run, add `npm run agent:cloud-qa`; otherwise delete with `cloud-qa-launcher*.mjs`, the Quint module and `cloud-qa-launcher.test.mjs`. | Low |
| 2 | 2-3 | D8 | Import before the file's doc comment. | Reorder. | — |
| 3 | 14-31 | B3 | Profile ancestry symlink walk, marker check, key-file mode/uid check: reasonable at a credential boundary. | Keep; reuse one `privateFile()` check shared with the other launchers (`start-combined-agent.ts:30` has its own). | Low |
| 4 | 34-51 | C5 | Same launch skeleton as `start-local-remote.ts`; both already use `private-runtime-launch.ts`. | Extract `launchPrivateDevServer({profile, port, source, route, settings, owned, remove})` into `private-runtime-launch.ts`; this file keeps only `cloudQaConfiguration`. | Low (Quint probe copies support files: update its list). |
| 5 | — | T1 | `core-state-patch.test.mjs:108-116` regex-checks five launchers for `coreRuntimeArguments(root,source,[`. | Delete; the Quint launcher probes execute the launchers. | — |

## Proposed end state
~25 lines: configuration + one call to a shared private dev-server launch function; an npm entry if the
owner keeps it.
