# specs/quint/refinement/services/notes-store/index.mjs
- Lines: 148 | Kind: Quint refinement driver (real upstream Notes store/service/interact + client decoder) | Verdict: KEEP
- Covers: `CanonicalNotesStore` (live, `specs/quint/services/manifest.json:1702`): canonical edit and no-op replay under clock ties, exact restore order from Trash, versioned edit superseding a timestamp-only representative, failed CAS readback then restart, stale writer CAS conflict, projection/expected-revision failure, held broadcast reply, empty clear. Duplicates: the host tests `notes-logical-revision`, `notes-replay-identity`, `notes-store-lifecycle` exercise overlapping cases on the same fixture (they are being merged into `test/integration/notes-store.test.mjs`; keep the overlap minimal there). Callers: `services/index.mjs:37` and `test/quint-canonical-notes-refinement.test.mjs` (T4: runs twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-31, 93-96 | A1? (owner check) | The `legacy` scenarios seed a schema-3 document whose notes lack `noteRevisions`. This is the upstream store's own current format (revision metadata is optional), not an Alpha migration path, so D1 does not apply. If upstream ever makes the field mandatory, delete these two schedules with the model's `legacyInit`. | Keep; rename `legacy` to `unversioned`. | Low |
| 2 | 16-19 | C3 / T8 | Local `until()` polling 2,000 `setImmediate` turns; a twin of `services/support.mjs:12`. | Import the shared `until`. | Low |
| 3 | 7 | C3 | Local `action()` (one of ~50 copies). | Shared helper. | Low |
| 4 | 143-147 | — | Explicit remaining obligations: fine. | Keep. | — |

## Proposed end state
Unchanged campaign on shared helpers, run once from the manifest-driven Quint runner. Models upstream code
(`vendor/eliza/plugins/plugin-notes`) through a real import; nothing to port.
