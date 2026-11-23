# scripts/start-local-voice-agent.ts
- Lines: 57 | Kind: development launcher | Verdict: DELETE (merge into `start-local-remote.ts`)
- Covers: launches the dev-server with local TTS always required and ASR when `ELIZA_ASR_ENABLED=1`, port 47844, profile `local-voice`. Duplicates: `start-local-remote.ts` already does the same through `speechEnvironment('asr'|'tts')`, which makes a service required when `ELIZA_*_ENABLED=1`. Callers: none at runtime (no npm script, workflow, doc or script); listed in `quint-lib.ts:13`; Quint `specs/quint/application/manifest.json:910` (DevelopmentHost source pin); tests `agent-identity.test.mjs:14` (launcher list), `core-state-patch.test.mjs:108` (T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | C5 / A7 | Copy-paste of `start-local-remote.ts` without the redaction, Cartesia, source-verification and supervised-child handling; no caller. | Delete; the equivalent is `ELIZA_PARADEE_ENABLED=1 npm run agent:local -- --profile ~/.local/share/alphaphone/local-voice --port 47844`. Remove from `quint-lib.ts`, the application manifest `sources`, and the two test lists. | Low |
| 2 | 31 | bug (minor) | `fs.statSync(keyPath)` throws ENOENT with no hint when the key file is absent. | Gone with the file. | — |
| 3 | 51-57 | B1 | Unsupervised `spawn` (no handoff retirement), unlike the reviewed-workflow launcher. | Gone with the file. | — |

## Proposed end state
Deleted.
