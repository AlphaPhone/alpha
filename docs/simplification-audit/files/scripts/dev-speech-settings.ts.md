# scripts/dev-speech-settings.ts
- Lines: 51 | Kind: script (dev launcher helper: reads `<profile>/local-speech.json`) | Verdict: KEEP + SIMPLIFY
- Covers: loads owner-only local speech asset paths/modes for the Mac local agent, explicit env wins. Callers: `scripts/dev-local.ts:4,14` (only). Tests: `dev-speech-settings`, `dev-local-launcher`, `client-feature-preparation`; allow-listed in `test/llama-cpp-only.test.mjs:36`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4,12-13,35-40 | A1 / A8 | Refuses `RENAMED` (earlier Alpha-only keys) and `RETIRED` (Whisper/Kokoro) names from `speech-env.ts`: a migration message for developer files from an older build. Unknown keys are refused anyway at line 43. | Delete both loops and the import; drop `RENAMED`/`RETIRED` from `speech-env.ts` (research `scripts.md` agrees). | Low |
| 2 | 18-33 | C3 | Hand-rolled bounded read with a 16385-byte buffer after an fstat size check; third copy of the private-file pattern. | Shared `readPrivateFile(path,{maxBytes:16384})`. | Low |
| 3 | 24 | B2 | `process.getuid && …`. | Direct call. | Low |
| 4 | 44 | D9 | Nested ternary validation in one condition. | Per-key validator table. | Low |

## Proposed end state
~25 lines: read private JSON, validate against a small key→validator table, merge with env.
