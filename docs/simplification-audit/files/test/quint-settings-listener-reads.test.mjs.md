# test/quint-settings-listener-reads.test.mjs
- Lines: 57 | Kind: Quint replay with marker-region import | Verdict: MERGE into `test/quint/refinement.test.mjs` after PORT
- Covers: SettingsListenerReads traces against the shipped `listenerReadGate` (older read dropped, read skipped during an action). Duplicates: Not in an aggregate. Also covered in part by `quint-settings-capability-reads` (listener row is excluded there). Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16 | T2/D7 | Cuts `settings-adapter.ts` between `// settings-reads:begin` and `// settings-reads:end` marker comments and imports it from a `data:` URL. The markers exist only for this test. | PORT: move `listenerReadGate` to its own module (`prototype/settings/listener-read-gate.ts`), import it, delete the markers. | Low |
| 2 | 18-19 | T1 | Two regexes pin the adapter's two call sites of the gate. | Delete. | Low |
| 3 | 53-56 | T3 | Unit check that a second `beginAction` is refused. | Drop; it is the model guard and the trace replay hits it. | Low |

## Proposed end state
- Driver imports the gate module; runner row.
