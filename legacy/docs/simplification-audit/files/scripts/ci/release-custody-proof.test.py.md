# scripts/ci/release-custody-proof.test.py
- Lines: 171 | Kind: tooling test (real OpenSSL, disposable keys, real tar/gzip) | Verdict: KEEP, MOVE to `test/release-custody-proof.test.py`
- Covers: generates 12 disposable RSA key pairs and certificates, builds the split encrypted archive and keystore, and drives `verify()`: full pass with public-identity export (no private material leaks), swapped OS pair refused, wrong keystore password refused, extra/duplicate/symlink tar members refused, scratch tmpfs left empty. Duplicates: none. Callers/importers: `.github/workflows/release-custody-proof.yml:46` (dispatch-only, before the real proof).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | T9 | Test file lives next to the script with a third naming scheme (`*.test.py`). | Move to `test/`; workflow step path updated. | Low (workflow pins the script's SHA, not the test's). |
| 2 | 13-17 | C7 | Loads the script by path because of the hyphenated name. | Plain import after the rename. | None. |
| 3 | 43-74 | — | 12 RSA-2048 keygens take a few seconds; acceptable. It gates a release and exercises real OpenSSL, so it is not a stub unit test. | Also run it from `npm test` when `scripts/ci/release*`/`android/signing/**` change (path-scoped), not only on dispatch. | None. |

## Proposed end state
`test/release-custody-proof.test.py`, run in the dispatch workflow before the proof and in the path-scoped release-tooling lane.
