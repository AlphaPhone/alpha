# specs/quint/refinement/services/native-google-access-file.mjs
- Lines: 321 | Kind: Quint refinement harness (compiles the real `GoogleAgentAccessFile.java` with `NativeGoogleAccessFileTraces.java`; bundles and runs the real `scripts/native-google-product-host.ts` on loopback) | Verdict: KEEP; MERGE the overlapping host test into it
- Covers: `NativeGoogleAccessFile.qnt` — missing/malformed/wrong-version/linked/FIFO/directory access files leave both switches off; writer refuses linked leaf/parent and directory targets; reader keeps the old record across an atomic replacement; turning access off refuses the next request before transport while an already-admitted request stays at verification; host restart re-reads the file; 7 traces, 66 checkpoints. Duplicates: `test/native-google-agent-host-access.test.mjs` (126 lines, its own `test/fixtures/GoogleAgentAccessFileTest.java`) covers "off unless version-1 booleans", "linked and nonregular files refused", "writes refused when off/missing/corrupt, reads still work", "switch change applies to next write without restart" — the same behaviours, plus per-operation coverage (mailbox, prepareSend, dispatchSend, calendarWrite). Callers/importers: `test/quint-native-google-access-file.test.mjs`, `services/index.mjs:43,90`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Two integration suites and two Java main fixtures (`NativeGoogleAccessFileTraces.java`, `test/fixtures/GoogleAgentAccessFileTest.java`) for one file contract. | Extend `api.request` kinds here to the four write kinds of the host test (mailbox, send prepare, send dispatch, calendar write) and keep lookup as the read; then delete `test/native-google-agent-host-access.test.mjs` and `GoogleAgentAccessFileTest.java`. | low |
| 2 | 34-63 | B5 | `loadHost` hashes initial sources, records every bundled file's hash in an onLoad hook, asserts every metafile input was hashed, re-hashes and compares before import. | Replace with the shared `sourceModule` (one bundle, one import). | low |
| 3 | 41 | — | `define` forces `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS: "0"` — correctly runs the production-mode host. | Keep. | none |
| 4 | 172-201 | — | `overlap()` patches `fs.openSync` + `syncBuiltinESMExports` to hold the reader between open and read — the core of the descriptor-snapshot proof. | Keep. | none |
| 5 | 96-109 | B1 | `readDisk` swallows parse errors as `'invalid'` — this is the specified observation, fine. | Keep. | none |
| 6 | test file:12 | B5 | Wrapper asserts exact `checkpoints === 66`. | Drop exact count; keep `passed`. | none |

## Proposed end state
~280 lines: shared loader, request kinds widened to every write kind, one Java trace fixture. `test/native-google-agent-host-access.test.mjs` and its Java fixture deleted. Model stays live (`AlphaLocalAgentPlugin.setGoogleAgentAccess` and the native host are production paths).
