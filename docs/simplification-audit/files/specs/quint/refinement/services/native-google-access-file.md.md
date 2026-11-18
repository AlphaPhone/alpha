# specs/quint/refinement/services/native-google-access-file.md
- Lines: 36 | Kind: formal model documentation | Verdict: MERGE into the header comment of `native-google-access-file.mjs`, then delete
- Covers: the Google agent access file contract (atomic private write by `GoogleAgentAccessFile`, no-follow nonblocking regular-file read by the host, both switches off on any bad record) and what the replay executes. Duplicates: harness `assumptions`/`obligations` (`.mjs:309-320`); file header of `test/native-google-agent-host-access.test.mjs:1-3`. Callers/importers: none outside itself.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-16 | A8 | "The JVM writer and host used to disagree about links … now opens …" is change history. | Drop; state the current contract only. | none |
| 2 | 3-8, 29-34 | — | Contract and limits are useful. | Keep 6 lines in the harness header. | none |
| 3 | 36 | T9 | Run instruction. | Drop. | none |

## Proposed end state
No `.md`; header comment in the harness states the contract and the out-of-scope items (Android device, power loss, already-admitted provider effects).
