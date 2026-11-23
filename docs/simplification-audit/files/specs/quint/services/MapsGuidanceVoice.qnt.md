# specs/quint/services/MapsGuidanceVoice.qnt
- Lines: 162 | Kind: Quint model, live (services manifest, 8 `symbols` pins, 6 witnesses) | Verdict: KEEP (drop symbol pins)
- Covers: spoken turn-by-turn guidance: newest instruction owns speech, nothing starts on a hidden page, an owed instruction is spoken on return only if its context still holds, provider failure mutes until retry, unchanged steps are not repeated (7 runs, 8 invariants). Duplicates: none. Callers/importers: manifest; `refinement/services/maps-guidance-voice.mjs` (esbuild bundle of the real `NavigationVoice` from `apps/app/src/maps/navigation-voice.ts`), registered in `forward-replays.mjs`; `test/quint-maps-guidance-voice.test.mjs`; aggregate via `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `symbols` | T10 | 8 names pinned (`latest`, `owed`, `resume`, `owe`, `hiddenDuringSpeech`, `speakAppText`, `navigationVoice` in `maps-adapter.ts`); the harness imports the class, so pins are redundant. | Delete `symbols`. | None |
| 2 | manifest `sources` | — | Lists `maps-adapter.ts`, which the harness does not execute. | Drop it from `sources` or note why. | Low |
| 3 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged; harness already imports the real class; path filter `apps/app/src/maps/navigation-voice.ts` + upstream `plugin-maps/src/client/navigation-voice.ts`.
