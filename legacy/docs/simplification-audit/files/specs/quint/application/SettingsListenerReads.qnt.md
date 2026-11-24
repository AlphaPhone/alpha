# specs/quint/application/SettingsListenerReads.qnt
- Lines: 74 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Always-on listener row: no status read starts during Pause/Turn off, and an older read never replaces the action result. Duplicates: none. Callers/importers: No refinement harness; `test/quint-settings-listener-reads.test.mjs` (57 lines) replays traces.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test | T2/D7 | `test/quint-settings-listener-reads.test.mjs:13-14` slices `settings-adapter.ts` between `// settings-reads:begin` and `// settings-reads:end` (marker comments in product code at `settings-adapter.ts:298`, whose comment cites `test/comms-settings.test.mjs`). | PORT: export `listenerReadGate` from a small module (`prototype/settings-listener-gate.ts`) and import it; delete the marker comments. | L |
| 2 | - | D7 | Model is live (D7 keeps always-on listening); `always-on-listener.ts` dormant invocation half is a separate decision (B255). | None. | - |

## Proposed end state
- Keep model; gate exported and imported; marker comments removed from product code.
