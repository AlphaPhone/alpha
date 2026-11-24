# test/native-voice-listener-rules.test.mjs
- Lines: 36 | Kind: source-text (regex/indexOf over `AlphaVoiceCloudPlugin.java` and upstream `LocalSpeechBridgePlugin.java`) | Verdict: DELETE
- Covers: `replace:false` synthesis requests never interrupt a playing clip or stream, and a busy speaker refuses browser reading before its approval is consumed. Duplicates: none executable in this repo. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-35 | T1 | Requires each bridge method to start with one exact 130-character statement. | Delete. | Medium: "reading approval not consumed while the speaker is busy" loses its only host check. |
| 2 | 21, 35 | T5 | Regexes upstream bridge source. | Delete; upstream follow-up. | Low |

## Proposed end state
File deleted. If the owner wants coverage: `journeys/browser.spec.ts` (Android native-fake) case "read page while a
reply is speaking is refused and the reading can be approved again".
