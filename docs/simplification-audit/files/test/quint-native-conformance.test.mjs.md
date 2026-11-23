# test/quint-native-conformance.test.mjs
- Lines: 12 | Kind: Quint wrapper that spawns `node specs/quint/native/conformance.mjs` as a script | Verdict: DELETE
- Covers: AlwaysOnListenerIndicatorReadback: listener, reset and audio-focus policies (app + upstream sense/voice/reset Java) agree with Quint traces. Duplicates: `specs/quint/refinement/native/index.mjs:71,94` imports `checkAlwaysOnListenerIndicatorReadback` from the same file and runs it in `quint-native-refinement`. Callers/importers: `npm test` glob and `package.json` script `quint:conformance` (line 69), which must be updated.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T9, T4 | Runs the model a second time through the script's `if (process.argv[1] === …)` main block. | Delete; also delete the script main and the `node specs/quint/native/conformance.mjs` line in `specs/quint/native/README.md:125`. | None |
| 2 | 11 | B5 | Asserts only that stdout matches `/conformance|assertions|states/i`: almost any output passes. | Gone. | None |
| 3 | — | D11 | `conformance.mjs` lives in `specs/quint/native/` beside the models, not in `refinement/native/`. | Move it to `refinement/native/always-on-listener-readback.mjs`. | Low |

## Proposed end state
Deleted. The always-on listener readback (D7 keeps the feature) runs once from the native index.
