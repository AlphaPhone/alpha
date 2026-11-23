# scripts/native-test-fixture.ts
- Lines: 219 | Kind: test support for manual emulator campaigns (wraps the pinned upstream isolated-Android-user runner with archive admission) | Verdict: KEEP (MOVE to `test/support/android/` with its campaign scripts when `scripts/test-*` moves to `test/`, T9)
- Covers: runs one instrumented class on an owned emulator in a disposable Android user, only against an archived app/test APK pair whose digests match `apk-manifest.json`, and writes `result.json`. Duplicates: shared types `IsolatedAndroidTest`/`IsolatedUserState` are cast onto the upstream runner in three campaign scripts; `ApkPair` name collides with a different shape in `scripts/android-workflow-native.ts:45`. Callers/importers (no npm script, no workflow): `scripts/test-browser-storage-format.ts`, `test-native-restart.ts`, `test-reminder-one-off.ts`, `test-reminder-recurrence.ts`, `reminder-recovery-fixture.ts`, `test-native-permissions.ts`, `test-native-calendar-deletion-restart.ts` (`runNativeFixture`/`fixtureCommandError`), and type-only `android-workflow-native.ts`, `test-calendar-regression.ts`, `test-installed-upgrade.ts`. These are referenced as manual campaigns from `scripts/android-instrumentation.ts` notes.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 112 | bug-risk | `fs.readFileSync("app.config.json")` is cwd-relative while line 94 resolves the repo root from `import.meta.dirname`. Running a campaign from another directory fails or reads the wrong file. | Read `path.join(root,'app.config.json')`. | Low |
| 2 | 113 | C6 | Hard-coded `"ai.alphacompute.alphaphone"` assertion of the app's own config. | Drop the assertion (B3: self-validation) or import the package id constant. | None |
| 3 | 117-118 | C3 | Local SHA-256 file hash. | Shared `sha256File` from `scripts/lib/`. | None |
| 4 | 9-11, 32-59 | C1 | 25-line hand-written type of the upstream runner's options (`IsolatedAndroidTest`) cast onto the upstream function with `as unknown as` in three scripts. | Type upstream once in a `.d.ts` beside the import, or import the runner's JSDoc types; delete the casts. | Low |
| 5 | 189-192 | B1 | `catch {}` around reading `user-verification.json` after a failure; the comment states the specified fallback. | Keep. | — |
| 6 | callers | A1 / D1 | Several callers look like legacy/upgrade campaigns (`test-installed-upgrade.ts`, `test-browser-storage-format.ts`). If those are deleted under D1, check whether `fixtureCommandError` and the exported types still have importers. | Re-run the importer grep after the D1 deletions. | Low |

## Proposed end state
Same function, root-resolved paths, shared hash helper, one upstream type declaration, no `as unknown as` casts in callers. Moves with the manual emulator campaign scripts into `test/support/android/` (or `test/android-campaigns/`) so that `scripts/` holds only build/CI tooling. It never runs in CI; that is by design (owned emulator only).
