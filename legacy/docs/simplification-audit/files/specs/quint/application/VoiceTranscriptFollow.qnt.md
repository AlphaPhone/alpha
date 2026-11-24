# specs/quint/application/VoiceTranscriptFollow.qnt
- Lines: 58 | Kind: Quint model (live: manifest, 10 scenarios, 4 invariants) | Verdict: KEEP, small SIMPLIFY; PORT harness
- Covers: after a voice turn is accepted the chat scrolls once to the delivered user row, only if the user was at the bottom or minimized, not reading history, same conversation and text; no focus change. Duplicates: none. Callers/importers: manifest; harness `refinement/application/voice-transcript-follow.mjs` (105); `test/quint-voice-transcript-follow-refinement.test.mjs` (9) and the aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 11, 36-37 | B4 | `focus` is initialised to 0 and never written, so `noFocusChange` is true by construction; it checks nothing in the model. The real property ("this intent only scrolls") is what the harness observes. | Drop `focus` and `noFocusChange` from the model; let the harness assert the active element is unchanged directly (or keep the projection without a model variable). Update manifest `invariants`. | Low |
| 2 | harness 11-32 | T2 / T10 | Harness slices `apps/app/src/prototype/model.js` from `'  componentDidMount() {'` (after `'class Component extends'`) to `'  componentDidUpdate(prev) {'`, injects instrumentation at a marker, writes a generated file to a temp dir and runs it in `vm` with JSDOM. | PORT with the `model.js` split: export the voice scroll-follow logic (`beginVoiceScrollFollow`, `followVoiceTurn`, the snapshot check) from a module and import it. | Medium |
| 3 | 1-3 | — | Source comment lists `development-cartesia-conversation.ts` (dev-only) as a source; the accepted-final callback is shared with production voice. | Keep; update `sources` if the dev conversation moves to `dev/`. | Low |
| 4 | test | T4 | Runs per-model and in the aggregate. | Run once. | Low |

## Proposed end state
Model without the inert `focus` variable (3 invariants). Harness imports an extracted scroll-follow module. One runner.
