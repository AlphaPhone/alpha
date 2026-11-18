# scripts/start-local-remote.ts
- Lines: 79 | Kind: development launcher (npm `agent:local`) | Verdict: KEEP as the one local launcher; absorb `start-local-voice-agent.ts` and `start-reviewed-workflow-agent.ts`
- Covers: launches the prepared pinned Eliza dev-server with an owner-only profile, Cerebras route, local embeddings, optional local ASR/TTS and Cartesia, optional upstream secret/PII swap (requires verified source). Duplicates: `start-local-voice-agent.ts` and `start-reviewed-workflow-agent.ts` repeat 80 % of it. Callers: `package.json` `agent:local`, `scripts/dev-local.ts:35`, `scripts/test-local-redaction.ts:82`; listed in `quint-lib.ts:13`; Quint `specs/quint/application/manifest.json:911` (DevelopmentHost sources); tests `agent-identity.test.mjs:54`, `agent-model-selection.test.mjs:24-26`, `agent-embedding-overrides.test.mjs:87` (run it), `dev-local-launcher.test.mjs:18` (stubs it), `core-state-patch.test.mjs:108` (T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18, 28-29 | C5 | Inputs via env (`ALPHA_ELIZA_SOURCE`, `ALPHA_REMOTE_PROFILE`, `ALPHA_REMOTE_PORT`) while the two sibling launchers take `--source/--profile/--port/--bun` flags. | Accept the flags (keep the env names as defaults for `dev-local.ts`), so the reviewed-workflow and voice cases become `npm run agent:local -- --profile … --port 47848` / `ELIZA_PARADEE_ENABLED=1 … --port 47844`. | Low |
| 2 | 24-27, 54-57 | C3 | Reads `upstream.lock.json` and calls `verifySource` twice in two branches. | Compute `needsVerifiedSource` once and verify once. | — |
| 3 | 32-35 | B1 / C5 | Key file mode checked with `statSync` (follows symlinks) while siblings use `lstat` + uid. | Shared `privateFile()` check. | Low |
| 4 | 61 | D8 | 900-character `owned` object including four Gmail/Calendar broker vars from one env var. | Build `owned` in steps; name the broker block. | — |
| 5 | 64-79 | C5 | Log/launch/process.json skeleton shared with `start-cloud-qa.ts`. | Shared `launchPrivateDevServer` in `private-runtime-launch.ts`. | Low |

## Proposed end state
One launcher (`start-local-remote.ts`, optionally renamed `start-local-agent.ts` with every reference)
taking flags with env fallbacks, delegating launch mechanics to `private-runtime-launch.ts`. The
reviewed-workflow and voice launchers are deleted; their Quint probe (`reviewed-workflow-launcher*.mjs`)
retargets this file with the matching flags.
