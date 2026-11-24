# test/deletion-window.test.mjs
- Lines: 55 | Kind: test of upstream code (T5): esbuild-transforms `.eliza/client-features/packages/contracts/src/deletion-window.ts` (generated from `vendor/eliza`) into a `data:` module; javac-compiles `vendor/eliza/plugins/plugin-native-action-journal/.../DeletionDeadline.java` with an inline Java main; regex over upstream `deferred-deletion-notice.tsx` and `DeferredDeletionCoordinator.java` | Verdict: DELETE
- Covers: the shared 10-second deletion window uses monotonic time, survives restart, Undo and expiry cannot both win, owner/clock-continuity checks, Java and TS deadlines agree, Undo shown as kept only on an `undone` receipt. Duplicates: all of it is upstream code (`@elizaos/contracts/deletion-window`, `plugin-native-action-journal`); upstream owns its tests (R6/D14). `test/shared-deletion-window.test.mjs` is a sibling JVM test of the same shared classes. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-13 | T5 / T2 | Re-runs upstream TS from a generated copy via `data:` URL instead of importing the package. | Delete. | Low |
| 2 | 38-44 | T5 / P6 | javac of an upstream Java class with an inline test main. | Delete; the pin-bump process runs upstream suites (research Q4). | Low |
| 3 | 45-55 | T1 / T5 | Regex over upstream UI and coordinator source. | Delete. | Low |

## Proposed end state
File deleted. If cross-language deadline agreement is wanted, it is an upstream test (listed in `cross-file-actions.md` §6
upstream follow-ups). Alpha's use of the window is exercised by the Calendar/Reminders/Notes deletion journeys.
