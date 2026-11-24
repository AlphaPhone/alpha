# scripts/prepare-local-agent.ts
- Lines: 87 | Kind: build step (top-level CLI) | Verdict: KEEP, SIMPLIFY (delete requalification path)
- Covers: clones the pinned upstream commit into `artifacts/local-agent-source`, writes a stamp, verifies the source, and (unless `--source-only`) installs dependencies with the exact Bun version. Duplicates: none. Callers/importers: `npm run agent:prepare`; workflows android.yml, android-emulator.yml, resident-android.yml (`--source-only`), browser.yml, digest-restart.yml; scripts `stage-local-agent-runtime.ts`, `stage-workflow-worker.ts`, `test-device-timing-source.ts`, `dev-*`, `build-workflow-worker.ts`, `stage-aosp-native.py`, `verify-packaged-runtime.py`; tests `prepare-local-agent-requalify.test.mjs`, `fixtures/prepare-local-agent.mjs`, `packaged-runtime.test.py`, `runtime-source-clone.test.mjs`; Quint `services/prepared-source-stamp.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | B5 (2.9) | Stamp contains SHA-256 of this script, `local-agent-source.ts` and `copy-file-clone.ts`; any refactor of the tool invalidates every prepared runtime. | Stamp on `upstream.lock.json` content only (commit + url). Update `verify-upstream.ts:60` and `ci/resident_native_source.py` which check the same hashes. | medium (stamp format change; prepared trees must be re-prepared once) |
| 2 | 14-57 | A4 | `--requalify-from/--preserve-stamp` (44 lines with fsyncs and lock files) exists to re-stamp a tree after (1) changes the tool hash. No workflow, npm script or doc uses it; only `test/prepare-local-agent-requalify.test.mjs` and the Quint `prepared-source-stamp` model. | Delete with (1), plus its test and Quint model/harness (D20: delete code and model together). | medium (formal model removal must be in the same change) |
| 3 | 38, 67, 70, 85 | B3 | `verifySource` runs up to four times per invocation. | Once after checkout, once after install. | low |
| 4 | 10 | — | `patches:[]` constant field. | Drop. | low (stamp readers) |
| 5 | 71-83 | — | Bun selection and version check is real behaviour; keep. | — | — |

## Proposed end state
~35 lines: clone pin if absent, verify, compare a lock-derived stamp, optionally `bun install --frozen-lockfile`, verify. No self-hashing, no requalification. Coverage of "prepared source matches pin" comes from CI running it.
