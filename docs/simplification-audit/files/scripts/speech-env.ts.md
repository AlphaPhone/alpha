# scripts/speech-env.ts
- Lines: 28 | Kind: dev-speech config helper | Verdict: SIMPLIFY, then MERGE `speechMode` into `scripts/host-speech-admission.ts`
- Covers: `speechMode` maps `ELIZA_*_ENABLED` to auto/off/required; `RENAMED`/`RETIRED`/`refuseRetiredSpeechNames` refuse old Alpha-only env names. Duplicates: `scripts/dev-speech-settings.ts:35-40` repeats the refusal for the saved JSON, although line 42 already rejects every unsupported key. Callers/importers: `scripts/host-speech-admission.ts:5`, `scripts/dev-speech-settings.ts:4`; Quint harnesses `specs/quint/refinement/services/combined-agent-launcher.mjs:23` and `combined-agent-launcher-probe.mjs:16` copy it into fixtures; tests `client-feature-preparation.test.mjs:203`, `dev-local-launcher.test.mjs:26` copy it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-19 | A8 | Refusals for env names retired by a migration (`ALPHA_LOCAL_TTS`, `ALPHA_WHISPER_BIN`, `ELIZA_KOKORO_*`). | Delete `RENAMED`, `RETIRED`, `refuseRetiredSpeechNames` and the duplicate loops in `dev-speech-settings.ts:35-40` (its generic "Unsupported local speech setting" stays). | Low: an old env var is then ignored rather than refused. |
| 2 | 22-28 | D4 | After (1) the file holds one 6-line function with one importer. | Move `speechMode` into `host-speech-admission.ts`; delete the file; update the two Quint harness support lists and the two test copy lists. | Low |

## Proposed end state
File gone; `speechMode` lives with its only user.
