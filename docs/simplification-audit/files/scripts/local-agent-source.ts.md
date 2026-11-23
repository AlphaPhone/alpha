# scripts/local-agent-source.ts
- Lines: 119 | Kind: shared build library (prepared upstream runtime source location, verification, cache seeding) | Verdict: KEEP + SIMPLIFY
- Covers: where the prepared local-agent source and workflow-worker output live (`sourceDirectory`, `workerArtifactDirectory`), that they are separated, the committed-tree verification (`verifySource` via upstream `immutable-workspace-source.mjs`), turbo agent-detection env stripping, and a copy-on-write seed from a matching local checkout (`seedCommittedCache`). Duplicates: `digest` (file sha256) has ~19 twins in `scripts/`; `errorCode` twin in `prepare-client-features.ts:8`; `admittedCommit` is one of ~30 upstream-lock readers (research `scripts.md` §4, C3). Callers/importers: ~30 scripts (`prepare-local-agent.ts`, `build-workflow-worker.ts`, `stage-local-agent-runtime.ts`, `prepared-workflow-worker.ts`, `cloud-resident-host.ts`, `dev-local.ts`, `dev-cloud.ts`, `start-*`, `verify-upstream.ts`, `native-google-host-artifact.ts`, ...), workflows `android.yml:75`, `browser.yml:66` (inline `node -e` imports), `digest-restart.yml:17` (path filter), `scripts/ci/resident_native_source.py` and `verify-upstream.ts:60` (hash pins of this file), `quint-lib.ts:18`, `source-snapshot.ts`, `stage-aosp-native.py`; tests `android-build-path.test.mjs`, `android-runtime-staging-selection.test.mjs`, `product-character-host.test.mjs` + fixture.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-9, 11-13 | C3 | Local `errorCode`, `present`, `digest` and `admittedCommit` (upstream.lock reader) duplicate helpers repeated across scripts. `digest` is exported and re-imported by 3 scripts as a general sha256 helper. | Move to `scripts/lib/{fs,hash,pin}.ts`; re-export nothing from here. | None. |
| 2 | whole | B5/T10 | `verify-upstream.ts:60` (`stamp.guardSha256`) and `scripts/ci/resident_native_source.py:12-13` pin the sha256 of this file's bytes, and `native-google-host-artifact.ts:66` lists it as an artifact input. Any edit here (including the formatter) invalidates prepared runtimes/stamps. | Decide if the stamp needs this file's hash at all (it is a selector, not runtime content). If kept, regenerate in the same commit as any edit; flag for the stage-F formatter run. | Medium: stamp mismatch forces re-prepare / CI failure. |
| 3 | 68-119 | D9 | `seedCommittedCache` is a 50-line loop that re-implements `git checkout` safety (path validation, symlink parents, blob sha1 recompute) so APFS clone can be used. It is a performance optimisation with real safety checks; the comment documents its cost. | KEEP the mechanism; split into `listCommittedEntries`, `verifyBlob`, `cloneEntries`. | Low. |
| 4 | 74, 77-78 | B1 | `catch{return false;}` on `rev-parse`: documented fallback ("Not a matching local checkout") - specified behaviour, keep. | none | n/a |
| 5 | 15-31 | A8 | Comment "old physical trees are never relabeled" / "including historical admitted roots" narrates history. | Rephrase to present tense or drop. | None. |
| 6 | 32-42 | keep | Turbo agent-detection env stripping is a real, documented upstream workaround (tested by `android-build-path.test.mjs`). | KEEP. | n/a |
| 7 | workflows | P5 | `android.yml` and `browser.yml` embed identical `node --input-type=module -e "import {sourceDirectory,verifySource}..."` one-liners. | Add a tiny CLI entry (`node scripts/local-agent-source.ts --print-verified`) or fold into the shared setup action. | None. |

## Proposed end state
~90 lines exporting `sourceDirectory`, `workerArtifactDirectory`, `assertWorkerOutputSeparation`, `verifySource`,
`preparedSourceEnv`, `seedCommittedCache` (split into three helpers), with hashing / pin reading / ENOENT handling from
`scripts/lib`. Callers that imported `digest` from here import the shared hash helper. The hash pins of this file in
`verify-upstream.ts` and `resident_native_source.py` are either removed or regenerated with every edit.
