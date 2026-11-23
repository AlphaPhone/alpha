# specs/quint/refinement/services/protected-app-update-promotion.py
- Lines: 297 | Kind: Python refinement campaign (runs real `scripts/ci/verify-cloud-signing-input.sh` with a closed `gh`, real `private-apk-storage` upload/download and `qualified-app-update` preflight/stage with patched transports) | Verdict: KEEP, SIMPLIFY
- Covers: the private half of `ProtectedAppUpdatePromotion`: signing admission per lane (private/push/dispatch) and its refusals (diverged source, cancelled run, expired artifact, floating input generation), unsigned restore with byte check, private upload before/partial/after-commit faults, protected publication review refusals (attempt, artifact, voice evidence), signed restore refusals (generation, bytes). Duplicates: `test/qualified-app-update.test.py` and `test/cloud-signing-input.test.py` test the same helpers (KEEP per their reports). Callers: spawned by `protected-app-update-promotion.mjs:210` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-20 | T9 / C7 | Loads `test/qualified-app-update.test.py` with `importlib` and reuses `QualifiedUpdateTest().setUp()` and its `BRIDGE`/`STORAGE` modules as the fixture. A unittest class used as a library; renaming a test method breaks the formal campaign. | Extract the fixture builder (`plan`, `producer`, `signed_tar`, `record`, `api`, `download`) into `test/support/qualified_update_fixture.py`; import it from both. | Medium |
| 2 | 23-32 | — | Closed `gh` replacement serving a fixed endpoint table from `GH_FIXTURE`: good isolation. | Keep. | — |
| 3 | 260 | — | Symlinks `scripts` into scratch so the real shell script runs: fine. | Keep. | — |
| 4 | 274-276 | owner | Schedules that record known weaknesses as passing traces ("main-push candidate has no signer route", "dispatch archive admission currently has no attempt pin"). They pin current behaviour that the assumptions text calls gaps. | Owner question: fix (then flip the expectation) or accept and keep. Not changed here (D16). | — |
| 5 | 98-250 | D9 | 150-line `campaign()` with an if/elif chain over five actions and nested closures. | Split into one function per action. | Low |

## Proposed end state
Same campaign, importing a shared Python fixture module instead of the unittest file, one function per action. Stays
Python because the helpers under test are Python (C7 is resolved when `scripts/ci` moves to one language, not here).
