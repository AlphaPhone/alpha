# test/voice-requested-actions.test.mjs
- Lines: 31 | Kind: transplant (slices `performVoiceRequestedActions` … `voiceRendererClientId()` out of `connection-ui.tsx`, strips types, evals in a vm context with fake `active.actions`, `navigationContext`, `readDevicePreferences`) | Verdict: DELETE
- Covers: a voice completion executes only the exact message after loading proposals; ask-first mode leaves proposals for review; a context/owner change or a retired proof blocks execution. Duplicates: `test/voice-request-provenance.test.mjs` test 2 (same slice, same proof cases). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-10 | T2 | Marker slice of `connection-ui.tsx` (markers at lines 2228/2251 today); breaks on any split or reformat (D1, D9). | Delete. | Low |
| 2 | 12-19 | T3 | All collaborators faked. | Delete. | None |
| 3 | 20-31 | T4 | Seven one-line tests duplicating `voice-request-provenance.test.mjs:87-110`. | Delete both. | None |

## Proposed end state
File deleted. Carry one case into `journeys/voice.spec.ts`: with "Ask before agent actions" on, a voice reply that proposes an action shows it for review and performs nothing until approved.
