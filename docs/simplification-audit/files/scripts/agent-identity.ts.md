# scripts/agent-identity.ts
- Lines: 66 | Kind: script helper (developer agent launchers: agent identity/config) | Verdict: MERGE into `scripts/agent-profile.ts`, SIMPLIFY
- Covers: derives the agent character from `alpha-product-registration.ts`, and selects/repairs identity metadata in a launcher profile's `eliza.json` without touching routing or credentials. Duplicates: `apps/app/src/product/native-cloud-runtime.ts:9` uses the same registration (comment says so; it reads the registration, it does not copy this code). Callers/importers: `start-combined-agent.ts`, `start-local-remote.ts`, `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`; Quint `combined-agent-launcher{,-probe}.mjs`, `reviewed-workflow-launcher{,-probe}.mjs`, `specs/quint/services/manifest.json:2087,2136`; tests `agent-identity.test.mjs`, `fixtures/agent-identity-canonical.test.ts`, `product-character-host.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | B3 | Validates our own product registration constant at import time. | Delete; the registration is typed. | None |
| 2 | 47-54 | A1 | Falls back to a "legacy" `selected.name` when a saved profile has no `identityName`, and rewrites the profile to add it. This is a migrate-on-read path for developer profiles made by older launchers. | Owner: if developer profiles may be recreated, delete the fallback and fail with the existing `identityRequired()` message. | Low (developer machines only). |
| 3 | 58-62 | B3 | `prepareAgentIdentityConfig` re-reads and re-parses the file to compare with the object the caller just read from it (check-act-check), plus uid/mode/nlink checks on a file the launcher created 0600. | Keep one private-file check in `private-runtime-launch.ts` (it already writes these files); drop the re-read compare. | Low |
| 4 | 17-18 | C3 | Local plain-object guard and trimmed-name helper. | Use the shared `scripts/lib` guard. | None |
| 5 | — | C5 | See `agent-embeddings.ts.md` finding 4. | Merge the three launcher helpers. | Low |

## Proposed end state
`agent-profile.ts` exports `AGENT_CHARACTER_ENVIRONMENT`, `freshAgentProfile`, `agentIdentityConfiguration` without the legacy-name branch, and a write that relies on `writePrivateRuntimeJson`. If `start-combined-agent.ts` is deleted (D5, combined host), its Quint launcher model goes with it.
