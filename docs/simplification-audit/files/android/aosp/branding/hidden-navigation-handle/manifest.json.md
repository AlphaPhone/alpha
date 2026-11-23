# android/aosp/branding/hidden-navigation-handle/manifest.json
- Lines: 25 | Role: pins Launcher3 revision, patch hash, file before/after hashes and the required `config_alpha_home_back_only` resource | Verdict: SIMPLIFY
- Importers: `apply.py:12`, `prepare.py:11`, `test_hidden_handle.py:9`. Not read by any script outside this folder. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-24 | B5 | `"renderOnly": true, "quickSwitchBehaviorChanged": false, "compilation": "pending", "deviceQualified": false` — no reader (git grep: only this file / PROVENANCE.json). | Delete the four keys. | None |
| 2 | 12 | B3 | `url` is rebuilt and asserted equal in `prepare.py:17-18`. | Drop `url`; prepare builds it. | Low |
| 3 | 15-20 | — | `requiredExistingResource` is read only by `apply.py:17-24`; if apply.py is deleted without porting the check, drop this block too. `owner` sub-field (line 19) has no reader. | Delete `owner`; keep or drop the block with the apply.py decision. | Low |
| 4 | 9-11 | — | Header scope matches `system-entry/apply.py`'s `--- a/<path>` expectation, so that tool can admit this packet unchanged. | — | — |

## Local types and helpers
None.

## Proposed end state
~15 lines: schema, project, revision, patch, patchSha256, files[{path, beforeSha256, afterSha256}], optional requiredExistingResource.

## Verification
`python3 prepare.py` (re-checks hashes); `python3 ../system-entry/apply.py <Launcher3> --manifest manifest.json`.
