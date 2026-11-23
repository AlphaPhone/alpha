# specs/quint/application/NotificationCollection.qnt
- Lines: 229 | Kind: Quint model (live; transplant harness) | Verdict: KEEP + PORT harness
- Covers: Opt-in external-notification collection: preview consent, authority/package/epoch fencing, lock redaction, bounded metadata history, native pause, own reminder dismissal re-checks the lock. Duplicates: native NotificationMirror behaviour is upstream (vendor) and also covered by Android instrumentation; browser double covered by notification browser specs (other chunk). Callers/importers: manifest row (8 sources incl. two vendor Java files, 8 symbol pins); harness specs/quint/refinement/application/boundaries.mjs `notificationCollection` (via family aggregate test/quint-application-refinement.test.mjs); application README; specs/quint/legacy/README.md mention

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | boundaries.mjs:54-91 | T2/T10 | Harness uses `sourceContext(['apps/app/src/browser/notifications.ts'], ['BrowserNotifications'], {...})`: strips types, deletes every `import` line by regex, and evaluates the text with ~20 hand-supplied globals standing in for imports. | PORT: bundle `browser/notifications.ts` with esbuild and stub its imports as named modules (same technique as notes-files-media-itf `loadProductModule`). `BrowserNotifications` is already exported. | M |
| 2 | 1-229 | - | Only the browser double (`native=false`) is replayed (4 traces); native transitions (pause, signature, uid, history failure) are checked only by the model itself. | Keep model; say so in abstractions (already stated). | L |
| 3 | manifest symbols | T10 | `symbols` like `pause`, `locked`, `batching` are generic words found by word-boundary regex in 8 files: a pin that cannot fail meaningfully and fails on rename. | Drop symbol pins. | L |
| 4 | manifest sources | P1 | Two vendor/eliza Java sources: any upstream bump re-runs this model in `quint:changed`. | Keep (models live product path) but note in lane matrix. | L |

## Proposed end state
Model unchanged. Harness bundles the real `browser/notifications.ts` with stubbed imports instead of regex-stripping it into a vm.
Symbol pins removed; file pins remain.
