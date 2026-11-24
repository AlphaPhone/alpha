# scripts/verify-aosp-clock.ts
- Lines: 15 | Kind: manual device CLI (read-only adb check of Clock handlers on a booted Alpha image) | Verdict: MERGE into `scripts/aosp-check.ts clock`
- Covers: wraps upstream `verifyAospClockHandlers` (via the 2-line re-export `aosp-clock-contract.ts`). Duplicates: same adb-runner boilerplate as `verify-aosp-listener.ts:15-17` and `verify-aosp-secure-camera.ts:11-13`. Callers: none (no npm script, workflow, test or doc; git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6–14 | C3 | Serial regex, `androidEnv()`, adb path and `execFileSync` runner copied in three CLIs. | `toolchain.ts adb(serial)`. | None |
| 2 | 6, 9 | C6 | Inputs via env vars (`ANDROID_SERIAL`, `ALPHA_EXPECTED_IMAGE_FINGERPRINT`, `ALPHA_ANDROID_USER`), while the listener CLI uses `--serial/--user` flags and the secure-camera CLI uses `ALPHA_EXPECTED_FINGERPRINT` (different name for the same fact). | One `parseArgs` with `--serial --user --fingerprint` for all subcommands. | Low |
| 3 | 4 | D4 | Imports through `aosp-clock-contract.ts`, a pure re-export of the vendor module. | Import upstream directly (then delete the re-export once `stage-aosp.ts` does the same). | Low |
| 4 | whole | A7 | No caller. | Owner question: run by hand during image acceptance? If not, delete instead of merging. | None |

## Proposed end state
Deleted; its body is the `clock` case of one `scripts/aosp-check.ts` (subcommands `clock | listener | secure-camera | launcher | pixel10a-source`) with shared arg parsing and the shared adb runner.
