# scripts/private-runtime-launch.ts
- Lines: 57 | Kind: library (typed facade over upstream `.mjs`) | Verdict: KEEP
- Covers: typed re-export of upstream's private runtime profile/env/process helpers plus `ResidentConfig`. Duplicates: the 12-line launcher block re-implemented in `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`, `start-combined-agent.ts` (scripts research 2.15). Callers/importers: `start-local-remote.ts`, `start-cloud-qa.ts`, `cloud-resident-host.ts`, `agent-identity.ts`, `agent-model.ts` (type only); Quint launcher harnesses (`cloud-qa-launcher`, `combined-agent-launcher`, `reviewed-workflow-launcher` and probes, `application/boundaries.mjs`); `test/fixtures/product-character-host.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-57 | D4/B2 | Exists to attach types (two `as unknown as` casts) to upstream functions. | Upstream follow-up: `.d.ts` next to `private-runtime-launch.mjs`; then import directly and keep only `ResidentConfig` (or move it to `agent-identity.ts`). | none |
| 2 | — | C5 | Three launchers do not use it. | Consolidate the five `start-*` launchers into one `start-agent.ts` on top of this module (research 2.15); `launcher-child.ts` merges here. | medium (three Quint launcher harnesses pin those files) |

## Proposed end state
Either a 15-line type module (after upstream ships declarations) or kept as is and used by every launcher.
