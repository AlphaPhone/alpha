# test/fixtures/development-scope-provider.mjs
- Lines: 13 | Kind: fixture (child-process preload: fake OpenAI-style provider, `http.Server.listen` patched to an ephemeral port) | Verdict: DELETE (orphan)
- Covers: nothing today. Duplicates: n/a. Callers/importers: none. `git grep development-scope-provider` and `git grep scope-provider` outside docs match only this file (research tests-host §orphans: last touched `69d9d0bbb`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Unreferenced. | Delete. | none |

## Proposed end state
Deleted.
