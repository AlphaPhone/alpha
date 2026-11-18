# scripts/copy-file-clone.ts
- Lines: 69 | Kind: script (shared helper: APFS clone / reflink copy with bounded argv batches) | Verdict: KEEP + SIMPLIFY
- Covers: copying large staged trees (runtime source, APKs) cheaply via `/bin/cp -c` on macOS and `COPYFILE_FICLONE` elsewhere, with exclusive (never-overwrite) mode. Callers: `scripts/local-agent-source.ts`, `prepare-local-agent.ts`, `verify-upstream.ts`, `stage-aosp-native.py`; tests `runtime-source-clone`, `android-build-path`, `client-feature-preparation`, `upstream-pin-guard`, `aosp-native-fixtures.py`, fixtures `core-state-root`, `prepare-local-agent`, `resident-java-source-stage`; Quint refinement harnesses (`native-google-host-artifact`, `prepared-workflow-worker`, `prepared-source-stamp`, `reviewed-workflow-launcher`, `mobile-bundle-admission`, `cloud-qa-launcher`, `combined-agent-launcher`) and `services/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55 | B1 / D9 | Pre-check throws an EEXIST error inside its own `try` and relies on the `catch` re-throwing anything not ENOENT. | `if (fs.lstatSync(file.destination,{throwIfNoEntry:false})) throw …`. | Low |
| 2 | 6-7,24 | D7 | `planCloneBatches`, `cloneArgumentBytes`, `CLONE_ARGUMENT_BYTES` exported only for `test/runtime-source-clone.test.mjs`. | Un-export once that unit test is replaced by an integration copy test. | Low |
| 3 | 67 | B3 | Re-stats each directory batch target that the planner derived from destinations the caller just created. | Keep (cheap, catches a caller bug before `cp` writes into a file path) or drop; low value either way. | — |

## Proposed end state
Same behaviour, ~60 lines, one public function `copyFilesClone`.
