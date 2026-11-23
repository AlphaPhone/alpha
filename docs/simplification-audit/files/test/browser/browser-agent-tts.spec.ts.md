# test/browser/browser-agent-tts.spec.ts
- Lines: 46 | Kind: Playwright spec, chromium; skipped unless `VITE_LOCAL_AGENT=1` (run by a separate step, `browser.yml:183`); module-in-page (T6), 7 tests | Verdict: DELETE
- Covers: the browser local-agent TTS/ASR client rejects cancelled, disconnected, mismatched, invalid or unavailable responses without falling back to browser speech; prepared audio cannot play after disconnect; ASR status/transcript requests. Duplicates: `browser-agent-playback.local.spec.ts` (real host), host tests of `local-agent.ts` (tests-host). Callers/importers: `.github/workflows/browser.yml:183` (extra dev-server profile step).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | P2/P3 | Fakes a `LocalAgentProtocol` session by assigning a private field and overriding `connectionController.getBrowserSpeechAgent`; `speechSynthesis.speak` replaced. | Delete. | Low. |
| 2 | 18-46 | T6/T3 | Every test calls `AlphaVoiceCloud.synthesizeLocal`/`client.speechRequest` directly; no UI. | Delete. | Medium: only coverage that local-agent TTS failures do not fall back to browser speech. |
| 3 | 6 | P17/P1 | Always skipped in shards; needs a second dev server profile in CI. | Deleting this, `browser-host-disclosure` and `host-reminder-recovery` lets the `browser.yml:178-183` step go. | None. |

## Proposed end state
File deleted. If the "no browser-voice fallback" rule must stay covered, it becomes one step in `journeys/voice.spec.ts` on the resident harness (TTS refused → no speech, error shown).
