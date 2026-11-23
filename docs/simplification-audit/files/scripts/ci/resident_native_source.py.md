# scripts/ci/resident_native_source.py
- Lines: 32 | Kind: CI library (generated Java provenance) | Verdict: MERGE into `resident_fixture.py`, SIMPLIFY
- Covers: checks that generated native source manifest pins the upstream commit with no patches, that every source row equals `git show <pin>:<path>` in `vendor/eliza`, generated Java digests match the frozen inputs, and that `ElizaAgentService`/`IpcStartupRecovery` are included. Duplicates: none. Callers/importers: `resident_fixture.py:8` only; listed in `scripts/source-snapshot.ts:46`; `test/resident-native-ci-admission.test.mjs` (text).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | scripts 2.9 (self-provenance) | Asserts hashes of `scripts/local-agent-source.ts` and `scripts/stage-local-agent-sources.ts` (tool source) are unchanged between freeze and run: helper refactors invalidate the archive. | Drop; the generated manifest content and upstream pin are the real inputs. Update `source-snapshot.ts:46` listing. | Low. |
| 2 | 32 | B4 | `return {}` that nobody uses. | Return nothing. | None. |
| 3 | all | D4 | 32-line module with one importer. | Inline into `resident_fixture.py`. | None. |

## Proposed end state
Deleted as a file; its checks (minus the tool self-hash) live in `resident_fixture.py`.
