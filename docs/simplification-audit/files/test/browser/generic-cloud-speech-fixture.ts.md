# test/browser/generic-cloud-speech-fixture.ts
- Lines: 33 | Kind: Playwright support. It monkey-patches `BrowserVoice.prototype.synthesize/play` in the page (P3), overrides `connectionController.getCloudEnvironment/getCloudClient` (P2), reads six private `BrowserVoice` fields, and calls the private `withAgentSpeech` | Verdict: **MERGE into `test/browser/harness/plugins/cloud.ts`** as a bridge-level speech fake (or DELETE with its importers)
- Covers: a "Cloud speech" stand-in with closed ports. Synthesis can be held, refused for billing (`voice-http-402`) or refused as busy (`playback-busy`); playback is recorded in `state.spoken` and controlled through `state.utterance.onend/onerror`. Importers: `dev-maps-voice.spec.ts`, `dev-workflow-automatic-speech.spec.ts`, `dev-workflow-speech.spec.ts` (all chromium dev-simulator specs; see their reports in other chunks). Duplicates: `cloud-voice-fixture.ts`, `native-speech-fixture.ts` and `voice-assistant-fixture.ts` (research §5, "Eliza Cloud fake" row).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-31 | P3 | It replaces two product methods and reimplements part of `BrowserVoice.play` (finish/notify), mirroring its private state. The comment on 16 admits it mirrors a specific commit ("since 1af960b6c"). | Fake at the speech boundary instead: the `AlphaVoiceCloud` plugin, or the Cloud TTS HTTP route in `page.route`. The real `BrowserVoice` then runs. | Medium. The three importers rely on hold, busy and billing controls; the boundary fake must offer the same three. |
| 2 | 12 | B3 | The `fields()` self-check exists only because the patch reads private fields. | It goes with the patch. | none |
| 3 | 16 | A8 | Commit-hash tombstone. | Goes with the patch. | none |
| 4 | 5 | C3 | A copy of the external-network abort route. | Use the harness auto-fence. | none |
| 5 | 8 | P2 | `connectionController` getters are overridden. | Use the harness Cloud session fixture. | none |

## Proposed end state
If any of the three dev-* speech specs survives, as a journey, their reports decide. Then `harness/plugins/cloud.ts`
offers `speech: {hold, billing, busy}` controls at the Cloud TTS route, the real `BrowserVoice` plays a silent
response, and this file is deleted. If none survives, delete this file with them.
