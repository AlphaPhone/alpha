# test/native-google-agent-host-access.test.mjs
- Lines: 126 | Kind: integration (real `GoogleAgentAccessFile.java` writer via `test/fixtures/GoogleAgentAccessFileTest.java` on host JVM, real native Google host from `scripts/native-google-product-host.ts` over loopback HTTP, synthetic Cloud transport) | Verdict: KEEP; MERGE into `test/integration/managed-google-broker.test.mjs`
- Covers: the phone's Google host enforces the owner's Gmail-changes / Calendar-edits switches from the file the Android plugin writes, read before every write, failing closed; reads keep working. Duplicates: `test/google-agent-access.test.mjs` (same switches at host-object level, no file, no HTTP). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | T9 | Self re-exec under tsx. | Shared loader for the merged file. | None |
| 2 | 59-96 | - | Parser refusals (wrong version, string booleans, symlink leaf/parent, directory, FIFO without blocking, .tmp/.bak ignored). Security-relevant file trust. | Keep, as one table plus the FIFO case. | Low |
| 3 | 98-126 | - | Real cross-language path: Java writes, Node host reads per request, refuses before Cloud, applies without restart. | Keep both cases. | Low |
| 4 | - | T4 | `google-agent-access.test.mjs` asserts the same refusals one level down. | Delete that file when this one moves (other chunk). | Low |

## Proposed end state
Moved into the merged Google broker integration file as its "owner switches" section (4 cases). `test/fixtures/GoogleAgentAccessFileTest.java` stays as its Java writer.
