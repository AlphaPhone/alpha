# specs/quint/refinement/native/crash-journal.mjs
- Lines: 61 | Kind: Quint refinement driver (Node; stages patched upstream `CrashLog.java`, runs `CrashJournalTraces.java` for 12 scenarios) | Verdict: KEEP; SIMPLIFY
- Covers: model `NativeCrashJournal` (live): problem-log record/read/clear across two bridges, capacity, retention, malformed rows, corrupt/oversize files, write faults, exit-history watermark, held read vs clear, native handler, unsafe timestamps. Duplicates: `test/quint-native-crash-journal.test.mjs` (T4); `test/device-plugin-diagnostics.test.mjs` (host test of the same members, see its report). Callers: `index.mjs:57`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17 | naming | Scenario `legacy-bridge` feeds malformed rows at the storage boundary; not an A1 migration path. | Rename to `foreign-rows` with the model label (as the `CrashJournalTraces.java` report says). | Low |
| 2 | 36-42 | B5 | consumer-host deep-equal, patch receipt and lock checks (same block as app-info/assistant/action-recovery). | Shared pin helper; drop the consumer-host assertion. | Low |
| 3 | 28 | — | `PluginWorkers.java` compiled whole: real executor policy. | Keep. | — |

## Proposed end state
Scenario list, shared staging/pin helper, campaign, `checkTraces`; run from the native aggregate only.
