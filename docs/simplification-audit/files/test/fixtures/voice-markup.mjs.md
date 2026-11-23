# test/fixtures/voice-markup.mjs
- Lines: 19 | Kind: transplant fixture (slices `template.html` between markers and renders it through the real `DCLogic` and `VoiceActivity` with react-dom/server) | Verdict: DELETE
- Covers: static markup of chat notices and inline voice controls. Duplicates: the voice Playwright specs render the real page. Callers/importers: `test/voice-calm-cloud-errors.test.mjs` and `test/voice-copy-presentation.test.mjs`, both research DELETE; no other importer (repo grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | T2, T10 | Markers: `<div class="alpha-chat-notices">`, `<sc-if value="{{legacyChatRecorder}}">`, `<sc-if value="{{inlineChatRecorder}}">`, `<sc-if value="{{panelComposer}}">`. `legacyChatRecorder` is itself a legacy path (A1) slated for deletion, so the fixture breaks with the cleanup. | Delete with both importers. | low |
| 2 | 13 | D8 | A 1,000-character esbuild call with an inline plugin; same plugin copied in `workflow-execution-markup.mjs`. | Gone. | none |

## Proposed end state
Gone. Voice copy and notices are asserted in `journeys/voice.spec.ts` on the rendered page.
