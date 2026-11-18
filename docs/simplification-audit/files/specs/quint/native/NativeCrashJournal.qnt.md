# specs/quint/native/NativeCrashJournal.qnt
- Lines: 196 | Kind: Quint model (live, `native` manifest; JVM refinement harness with a product slice) | Verdict: KEEP; PORT the `AlphaDevicePlugin` slice
- Covers: the problem-log journal: 50-row cap, 30-day retention window, exit-history watermark, bridge read allowlist (no extra fields, unsafe timestamps dropped), closed workers drain only accepted work. Duplicates: upstream `CrashLog` tests (B104 `SettingsCrashLog#forcedUncaught…` is a pure upstream test). Callers/importers: `native/manifest.json` (8 tests, 4 invariants), harness `refinement/native/crash-journal.mjs` + `crash-journal-platform.mjs`; `test/quint-native-crash-journal.test.mjs`; native aggregate; README `:674`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 | `crash-journal-platform.mjs:26` slices `AlphaDevicePlugin.java` between `' private final java.util.concurrent.ExecutorService diagnosticsWorker='` and `' /** Non-secret build identity'` (present after stage A; the file is modified in this branch). Also slices Capacitor `PluginCall.java` (third-party). | PORT: the D1 split of `AlphaDevicePlugin` should give the crash-journal bridge its own class (`CrashJournalBridge` or similar) that the harness compiles whole. Do that split and the harness port in the same change. | H: stage C/F edits to `AlphaDevicePlugin` break this harness |
| 2 | 16, 35-37, 190 | D11 | Seed named `"legacy"` is rows with an extra field and string/fraction timestamps: the current bridge allowlist/redaction, not a legacy reader. | Rename the seed to `"malformed"` (model + harness). | L |
| 3 | test wrapper | T4, B5 | Run twice; pins `traces 12`, `observedFields 12`. | One runner; `> 0`. | L |

## Proposed end state
Unchanged behaviour, clearer seed name; harness compiles the extracted crash-journal bridge class instead of a slice of
the 1k-line device plugin.
