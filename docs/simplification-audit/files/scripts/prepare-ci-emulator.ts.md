# scripts/prepare-ci-emulator.ts
- Lines: 117 | Kind: CI fixture preparation (top-level script) | Verdict: KEEP, SIMPLIFY (optionally MERGE with `prepare-ci-webview.ts`)
- Covers: on a disposable CI AVD: wait for boot, admit fixture identity and display via upstream hosted-fixture helpers, complete setup, set size/density, select stock launcher as HOME, pin screen-off timeout. Duplicates: HOME query logic resembles `pilot-update.ts:120-124`. Callers/importers: `.github/workflows/resident-android.yml:518,605`, `scripts/ci/emulator-suite.ts:99` (android-emulator.yml); `test/ci-emulator-evidence.test.mjs` asserts the command string.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-32, 111-114 | B5 | Writes `display-admission.json` and `idle-policy.json`; grep finds no reader (uploaded only as artifacts if at all). | Keep only if the workflow uploads them for debugging; otherwise log to stdout. | none |
| 2 | 102-110 | B4/B5 | Reads the current user three times and the timeout twice to "confirm" a `settings put` on a disposable AVD. | One put, one get. | low |
| 3 | 33-51 | B1 | Diagnostics capture swallows errors (documented: must not mask the admission failure). | Keep, comment is adequate. | — |
| 4 | 54 | B2 | `as unknown as` re-typing of an upstream helper. | Upstream `.d.ts`. | none |
| 5 | 13-15, 36-41 | C3 | Its own adb runner twice; 16 adb helpers repo-wide. | Shared `adbFor(serial)` from `scripts/lib/adb.ts`. | low |
| 6 | — | T1 | `ci-emulator-evidence.test.mjs:221-223` asserts the suite command list text. | Delete those assertions. | none |

## Proposed end state
~70 lines in `scripts/ci/prepare-emulator.ts` (moved next to `emulator-suite.ts`, its only in-repo caller besides the workflow), with a `--webview` mode absorbing `prepare-ci-webview.ts`, shared adb helper, no evidence files nobody reads.
