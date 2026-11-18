# specs/quint/application/CanonicalNotesView.qnt
- Lines: 94 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: CanonicalNotesUi collection projection: new-draft overlay, in-place replacement, no local handles in public rows, owner-loss masking, navigation waiter draining. Duplicates: Aggregate re-run (T4). Callers/importers: `specs/quint/refinement/application/canonical-notes-view.mjs` (+ `.md`), `test/quint-canonical-notes-view.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 20-40 | T10 | esbuild onLoad plugin `readFileSync`s `canonical-notes-ui.ts` and applies ~5 text replacements to expose projection internals. | Export a pure `projectCanonicalRows(...)` (or an inspect method) from canonical-notes-ui.ts and import it. | Product module gains one export (D7: only if the model needs it). |
| 2 | manifest | T4 | Aggregate duplicate. | Drop from aggregate. | None. |

## Proposed end state
Unchanged model; harness imports an exported projection instead of rewriting source; one runner.
