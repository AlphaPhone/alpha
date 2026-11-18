# test/shared-deletion-window.test.mjs
- Lines: 45 | Kind: JVM run of the upstream suite (`vendor/eliza/plugins/plugin-native-action-journal/test/native-host/DeferredDeletionTest.java` against staged pinned sources) + source-text (Alpha binding constants, files that must not exist, `deletion-undo.tsx` JSX) | Verdict: MERGE test 1 into the host-JVM runner until upstream CI owns it; DELETE test 2
- Covers: The pinned deferred-deletion engine (deadline, journal, claim, receipt recovery, coordinator) passes, and Alpha binds it with its installed slot/work names. Duplicates: `test/browser/durable-delete-undo.spec.ts` (renderer notice), `notes-permanent-delete-backstop.spec.ts`. Callers/importers: `npm test` glob only; `test/fixtures/native-source.mjs` (`prepareNativeFixture`), `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-26 | T5 | Runs an upstream test file from `vendor/eliza`; that is upstream's suite (R6/D14 follow-up). Runtime: prepares the native fixture and compiles ~10 classes (~10-20 s). | Keep as one JVM-runner row until upstream CI runs it; then delete. | Med |
| 2 | 28-45 | T1 | Regexes persisted names (`native-delete-journal:v1`, `alpha-delete-window`), `ExistingWorkPolicy.REPLACE` and a full JSX line; `existsSync(...)===false` for removed files is a tombstone check (A8). | Delete. Persisted names are G5-protected by review, not regex. | Low |

## Proposed end state
File deleted; the upstream suite becomes a row in the JVM runner tagged "upstream follow-up" (cross-file-actions §6).
