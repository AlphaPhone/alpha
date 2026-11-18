# scripts/paradee-runtime.ts
- Lines: 113 | Kind: build gate (library + CLI) | Verdict: KEEP, SIMPLIFY
- Covers: verifies the staged Paradee voice native output (`.eliza/paradee-voice/native`) against its build record, the pinned FFI gitlink/header, the pinned TTS inputs and the reviewed ASR slot, and that the app's `libelizainference.so` matches the record. Duplicates: FFI pin check repeats `prepare-embedding-host.ts:23-28`. Callers/importers: Gradle (`android/app/product.gradle:143 --app-linkage`, `android/local-speech/build.gradle:47`), `android-stage-voice-models.ts`, `build-pinned-voice.ts`, `voice-host.ts`; tests `paradee-runtime.test.mjs` (17 cases), `android-build-path.test.mjs`, `upstream-pin-guard.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | C3 | Local SHA-256 helper (~40 twins in scripts). | Import `scripts/lib/hash.ts`. | low |
| 2 | 32 | C3 | Local `git -C` wrapper (17 twins). | `scripts/lib/git.ts`. | low |
| 3 | 24, 38, 41 | C3 | Same "no symlink on any path segment" loop written three times. | One `assertNoSymlinkPath(root, rel)` helper (also needed by `prepare-local-agent.ts`, `prepared-workflow-worker.ts`, `prepare-embedding-host.ts`). | low |
| 4 | 34, 74 | C3 | `upstream.lock.json` parsed twice in one call path (30 lock readers repo-wide). | Read once, shared `readUpstreamLock()`. | low |
| 5 | 73, 102 | B3 | `build-record.json` parsed twice; `verifyParadeeAppLinkage` re-reads what `verifyParadeeRuntime` already validated. | Return the record from `verifyParadeeRuntime`. | low |
| 6 | 82 | C3/D8 | Inline recursive walker on one 300-character line. | Shared walker from `scripts/lib/fs.ts`. | low |
| 7 | 22, 82, 86-87 | D8 | Statement soup (multi-statement lines, 250+ chars). | Format; split checks into named steps. | none |
| 8 | 69, 96, 108 | B5 | `qualified:false` is a constant in every return; only documents a non-claim. | Drop the field; keep the doc comment. | low (check `voice-host.ts` reads) |
| 9 | 57, 60-62 | B3 | `slot?.backend`, `row?.path` optional chains over a typed parameter. The JSON *is* a trust boundary (checked-in file), so validation stays, but typed as `unknown` and parsed once. | Type input as `unknown`, validate once. | none |

## Proposed end state
~80 lines: one `verifyParadee(root, {abis, allowAbsent, appLinkage})` that reads lock, record and manifest once, uses shared hash/git/walk/symlink helpers, and is called by Gradle. `paradee-runtime.test.mjs` keeps only integration cases that build a fake native tree and run the CLI (accept, tampered file, stray ASR file, missing ABI); unit-style cases on `asrSlotFiles` fold into those.
