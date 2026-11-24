# test/browser/browser-agent-playback.local.spec.ts
- Lines: 39 | Kind: Playwright spec, `live` project (manual, `npm run test:browser:live`), 1 test, opt-in via `ALPHA_REAL_LOCAL_TTS=1` | Verdict: KEEP (manual live lane)
- Covers: against a real local host, the first TTS request plays without a readiness probe (exactly one `/api/tts/paradee` request) and playback completes. Duplicates: none (only real-host speech check). Callers/importers: `package.json` `test:browser:live`; `ALPHA_REAL_LOCAL_TTS` has no setter in repo (manual opt-in).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-13, 22-35 | T6 | Calls `connectionController.startLocal()` and `AlphaVoiceCloud.synthesizeLocal/play` directly. Acceptable for a live qualification probe of a real service. | Keep; document as live-only. | None. |
| 2 | 16 | T9 | Double gate: `live` project and an env knob. | Drop the env skip if the live project is only ever run deliberately. | Low. |
| 3 | 32 | T8 | 50 ms polling loop in-page for completion. | `expect.poll` on a recorded event. | None. |

## Proposed end state
Stays under the live lane (CI never runs it). Remove the redundant env gate or keep it with a comment that the host must be freshly restarted.
