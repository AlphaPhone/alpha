# test/pinned-voice-build.test.mjs
- Lines: 53 | Kind: tooling (real `buildPinnedVoice` with injected identity, upstream verifier and builder) | Verdict: DELETE (with `scripts/build-pinned-voice.ts`, pending an owner answer)
- Covers: `scripts/build-pinned-voice.ts` writes source provenance into the build record only for a fresh, successful, unchanged-source build whose artifact hashes match. Duplicates: none. Callers/importers: `npm test`. The script under test has no caller: whole-repo grep (package.json, `.github`, `scripts`, `README.md`, `docs`) finds only this test (`research/scripts.md:468`: "manual tool").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | A7 | The script is not wired to any npm script, workflow or document. The README's voice staging path does not name it. | Delete the script and this test, unless the owner runs it by hand; in that case add an npm script and keep the test in `test/release-tooling/voice.test.ts`. | low |
| 2 | 15 | B5 | The fake builder writes a record and a `.so`; the test checks provenance stamping (evidence ceremony around a build record). | Gone with the file. | none |
| 3 | 5-6 | D8 | Imports appear after a statement. | Gone with the file. | none |

## Proposed end state
Deleted together with `scripts/build-pinned-voice.ts` (58 lines). If the owner keeps the tool, it gets an npm entry point, and this test
moves, unchanged in substance, into `test/release-tooling/voice.test.ts`.
