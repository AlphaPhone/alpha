# specs/quint/refinement/application/voice-transcript-follow.mjs
- Lines: 105 | Kind: Quint refinement harness — slice of `prototype/model.js` (`componentDidMount`…`componentDidUpdate`) with an injected observer at a statement marker, written to a temp file and run in a VM with JSDOM | Verdict: PORT
- Covers: `VoiceTranscriptFollow` — after an accepted voice transcript, the chat list scrolls to the new user row once, only for the same conversation and text, not while the person reads history or selects text, and not after owner change or chat close. Product: `apps/app/src/prototype/model.js` (`beginVoiceScrollFollow`, `followVoiceTurn`, `getSnapshotBeforeUpdate`). Duplicates: voice Playwright journey (transcript appears) without the scroll races. Callers: `test/quint-voice-transcript-follow-refinement.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-22 | T10 | Cuts from `'  componentDidMount() {'` (after `'class Component extends'`) to `'  componentDidUpdate(prev) {'`, and inserts an observer before `'    var newTurn = voiceTurn ||'` (asserted unique). | With the `model.js` split, move voice scroll-follow into a module with an observable result (e.g. `followDecision()` returned value), import it. | M |
| 2 | 74-78, 104 | D8 | Writes the generated code to a temp file only to hash it as a "generated source". | Evaluate in memory; drop the temp file. | L |
| 3 | 71-73 | B5 | Hashes `voice-adapter.ts`, `agent-adapter.ts`, `development-cartesia-conversation.ts`, aggregate test and index though none executes. | Drop. | L |
| 4 | 28-31 | — | Controlled geometry (`scrollHeight` 1000) is a fair port. | Keep. | — |

Product file read as text: `apps/app/src/prototype/model.js` (anchors above).

## Proposed end state
Imports the extracted scroll-follow logic; ten schedules unchanged; no temp files or extra provenance.
