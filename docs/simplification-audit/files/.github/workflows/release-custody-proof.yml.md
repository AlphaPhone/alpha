# .github/workflows/release-custody-proof.yml
- Lines: 71 | Kind: protected release workflow (dispatch; verify key custody, export public identities) | Verdict: KEEP
- Covers: on a reviewed main commit, pins the custody checker by SHA-256, runs its own self-test with disposable keys, then `scripts/ci/release-custody-proof.py` with the OS release key parts and app keystore secrets, exporting only public identities. Duplicates: none (it is the only check of the OS release key parts outside actual OTA signing). Callers/importers: dispatch; 2 runs. Named in `README.md`, `scripts/ci/release-custody-proof.py`, `release-custody-proof.test.py`, `scripts/ci/sign-os-ota.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 45-46 | T9 | `release-custody-proof.test.py` (a unit test of the checker) runs inside the release job. | Also run it in the host lane (`test/python-suites.test.mjs`), so changes to the checker are tested on PRs; keeping it here as a pre-secrets gate is fine. | None. |
| 2 | 35-44 | KEEP | Input-pinning of the checker hash before secrets is a deliberate supply-chain guard. | Keep. | None. |
| 3 | whole | — | Owner question whether custody proof is recurring (research §10 Q7). | No change. | Owner. |

## Proposed end state
Unchanged (71 lines); its self-test additionally runs in the host test lane.
