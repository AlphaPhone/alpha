# specs/quint/refinement/native/renderer.mjs
- Lines: 125 | Kind: Quint refinement driver; bundles and runs `apps/app/src/runtime/voice-assistant.ts` (no slicing) | Verdict: KEEP; SIMPLIFY
- Covers: `VoiceAssistantSession` one-turn traces: start, speech edges, segment, long-gap submit, stop/retire/mute while pending, sentence playback, stop while speaking. Model `VoiceSession` (`VoiceSession-native`). Duplicates: none. Callers/importers: `native/index.mjs:10,162-169` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-25 | C5 | Discover/hash/rebuild/import routine shared in spirit with `navigation-progress.mjs:28-56` and `request-withdrawal.mjs`. Builds the bundle twice only to hash inputs in between (B5). | One shared `bundleModules` helper that builds once. | Low |
| 2 | 19-20 | B5 | Hashes `upstream.lock.json` and `.eliza/client-features/.source.json` as sources. | Drop. | None |
| 3 | 28-35 | C3 | `flush`, `deferred` redefined. | Shared helpers. | None |
| 4 | 23 | — | Cache-busting `#uuid` on the data URL keeps repeated imports isolated; harmless. | Keep in the shared helper. | — |
| 5 | name | D11 | The name says nothing about voice; it is the voice-session harness. | Rename `voice-session.mjs` in the structural pass. | None |

## Proposed end state
~100 lines: shared bundle helper, `voiceHarness`, `voiceTraces`.
