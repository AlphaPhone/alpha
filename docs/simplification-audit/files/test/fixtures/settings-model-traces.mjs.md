# test/fixtures/settings-model-traces.mjs
- Lines: 46 | Kind: Quint replay helper (runs `quint test` and turns ITF traces into expected states) | Verdict: KEEP, MOVE to `specs/quint/refinement/application/settings-session-traces.mjs`
- Covers: every named `run *Test` scenario of `specs/quint/application/SettingsSession.qnt` produces one expected state per `.then(action)`, with the queued value or settled operation picked from the trace. Duplicates: the trace-picking pattern exists in other `specs/quint/refinement/**` drivers (it imports `plain`, `repositoryRoot` from `services/identity-comms-traces.mjs`). Callers/importers: only `test/quint-settings-session.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12, 24 | T10 | It regex-parses the `.qnt` source (`run (\w+Test) = init ...`, `.then((\w+)`) to learn scenario names and action order. It reads the spec, not product text, but a reformatted spec silently changes the parse. | Ask Quint for the actions instead: run the scenarios with `--mbt` / ITF `mbt::actionTaken` metadata (or name scenarios in the manifest), and drop the regexes. | low |
| 2 | 13 | B5 | `scenarios.length >= 8` is an exact-ish count assertion on the spec. | Delete; a missing scenario already fails the per-name lookup. | none |
| 3 | 16-19 | — | Runs Quint (`--backend=typescript`, 120 s timeout) once per process. Notable runtime. | Run only in the Quint lane, path-filtered to `specs/quint/**` plus the settings module it refines (P1). | none |
| 4 | 1-46 | — | It is formal-harness code living under `test/fixtures`. | Move next to the other application refinement drivers; let the manifest-driven Quint runner call it (the research verdict for `quint-settings-session.test.mjs`). | none |

## Proposed end state
A settings-session trace reader inside `specs/quint/refinement/application/`, driven by the single Quint runner. It
gets scenario and action names from Quint output rather than from regexes over the `.qnt` text. The model stays at 100 %.
