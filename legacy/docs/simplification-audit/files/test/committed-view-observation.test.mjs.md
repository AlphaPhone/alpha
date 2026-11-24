# test/committed-view-observation.test.mjs
- Lines: 64 | Kind: source transplant: `fixtures/committed-view-observation.mjs` concatenates eight upstream `vendor/eliza` sources (events, view-interact protocol, handoff, completed navigation, installations, pending map, interaction host, views routes) plus `apps/app/src/runtime/view-navigation.ts`, strips types/imports and runs them in one `vm` context; the last case also slices `function context(shell: Shell)` out of `prototype/agent-adapter.ts` | Verdict: DELETE (Quint refinement keeps the property)
- Covers: a committed-action view observation settles once: abandoned observations (before/after/deadline/disposed) send one negative result, unchanged view records one positive, retired/lost/foreign custody stays unknown with the host timeout, superseded claims settle, lost acknowledgements are not replayed; chat overlays keep the underlying Calendar/Settings view as context. Duplicates: `test/quint-committed-view-observation.test.mjs` + `specs/quint/refinement/application/committed-view-observation.mjs` (same fixture, Quint traces); `test/browser/view-navigation-react.spec.ts`. Callers/importers: `npm test` glob. Fixture importers: this file, `test/quint-committed-view-observation.test.mjs`, `specs/quint/refinement/application/committed-view-observation.mjs` — fixture survives through the Quint harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T2 / T5 | Seven of eight transplanted files are upstream; Alpha's only code is `view-navigation.ts`. | Delete here; the Quint refinement already replays the same fixture against the model. | Low |
| 2 | 53-64 | T2 / D7 | Slices `agent-adapter.ts` at `  function context(shell: Shell) {` .. `  p.componentDidMount` and calls it with nine injected names (`syncPreviousNotesAvailability`: a "previous notes" A1 legacy hook). | Delete; overlay-context behaviour belongs in `journeys/home-shell.spec.ts` (open chat over Calendar, ask "what's on screen", assert the agent sees calendar). | Low |
| 3 | 7-51 | T4 | Mode lists duplicate the Quint replay traces. | Delete; Quint keeps them. | None |

## Proposed end state
Deleted. Property stays in the Quint model and its refinement harness (to be PORTed from vm transplant to imports per T10). Overlay context: one journey step.
