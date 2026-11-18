# scripts/ci/sign-os-ota.test.py
- Lines: 130 | Kind: tooling test (real ZIP fixtures through `validate`/`inspect_target`/`extract_tools`; `ROOT` redirected to a temp dir) | Verdict: KEEP, MOVE to `test/sign-os-ota.test.py`
- Covers: bound plan and reviewed target admitted; foreign purpose/commit/device/timestamp/output and unbound storage objects refused; empty or missing reviewed-target list closed; each lineage field bound; metadata copied onto foreign APEX/cert/vbmeta bytes still refused by lineage; data partitions, target-supplied hooks, signer changes and wrong build refused; tool archive path traversal refused without writing outside. Duplicates: none. Callers/importers: `.github/workflows/release-os-ota-signing.yml:74` only (dispatch, before signing).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | T9 | Test next to the script with the `*.test.py` scheme. | Move to `test/`, update the workflow path. | None. |
| 2 | 21-23 | T3 | Monkey-patches module `ROOT`; otherwise runs real code on real ZIPs. It guards a release-signing admission (security rule: never sign an unreviewed image), which no integration run can cover without real keys. | Keep: release-gating tooling test (brief exception). | — |
| 3 | — | P1 | Runs only on dispatch. | Also run in the path-scoped release-tooling lane when `scripts/ci/sign-os-ota*`/`android/signing/**` change. | None. |

## Proposed end state
`test/sign-os-ota.test.py`, run before signing and on relevant PRs.
