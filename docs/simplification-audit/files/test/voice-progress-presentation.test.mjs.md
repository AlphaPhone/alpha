# test/voice-progress-presentation.test.mjs
- Lines: 68 | Kind: transplant (`cloud-voice-view.mjs` with `testMocksEnabled` and `developmentCartesiaVoiceEnabled` forced on and `developmentCartesiaConversation` replaced) | Verdict: DELETE
- Covers: on the development realtime path, server-accepted progress text appears as the turn status above the composer, is never saved as a message or spoken by the client, clears on SDK state changes and errors, and an old session's label cannot return after Stop. Duplicates: `voice-progress-state-forwarding.test.mjs` (same path, the adapter side). No browser spec asserts `turnStatus` (grep). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-17 | T2/D5 | Turns on development flags inside a transplant box to reach a development-only path. | Delete. | Low |
| 2 | 18-43 | gap? | "Progress is never saved as a message" is a real rule if the production Cloud path also shows progress. The test only exercises the development Cartesia path. | Owner question (see chunk): if production voice shows server progress, add one journey case; otherwise nothing to carry. | Low |

## Proposed end state
File deleted.
