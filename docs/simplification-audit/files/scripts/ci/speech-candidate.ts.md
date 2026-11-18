# scripts/ci/speech-candidate.ts
- Lines: 164 | Kind: CI script (admit an APK for, and package, the hosted x86_64 on-device speech run) | Verdict: DELETE with the unreachable `fused-speech` job (owner to confirm hosted voice staging is not imminent)
- Covers: `check` refuses an APK whose Paradee voice bundle or x86_64 engine libraries differ from `android/voice-host/qualified-voice-host.json`; `package` copies the instrumentation record and APK pair and writes `result.json` stating what the run proves. Duplicates: voice inventory checks overlap `hosted-native-inputs.py` and `android-stage-voice-models.ts`. Callers/importers: `.github/workflows/android-emulator.yml:307` (job `fused-speech`) — but the shared `build` job refuses `suite == 'fused-speech' || 'all'` at `:72-76` ("hosted staging is an open item"), so the job can never reach this script; `scripts/ci/emulator-suite.ts:17` (comment); `test/ci-emulator-evidence.test.mjs:10,196-198` (unit + workflow text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 / P4 | Only reachable from a job its own workflow refuses to build for. Research (`ci-and-formal.md` §dead) lists the `fused-speech` job and `all` option as unreachable. | Delete this script, the `fused-speech` job, the `fused-speech`/`all` inputs and the refusal step, and the speech blocks of `ci-emulator-evidence.test.mjs`; keep `FUSED_SPEECH_CLASSES` only if the device campaign (`owner/emulator-campaign-check.ts`) uses it. | Medium: on-device voice is an MVP area (PRD); the qualification route is then physical-device only, which is already what admission requires. |
| 2 | 64-69, 157 | B1 | `catch { return false }` and swallowed APK read. | Moot if deleted. | — |

## Proposed end state
Gone; restore from git when hosted voice staging exists. Owner question recorded.
