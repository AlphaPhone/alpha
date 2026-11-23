# android/aosp/branding/hidden-navigation-handle/prepare.py
- Lines: 43 | Role: fetches (or reuses) the pinned `StashedHandleView.java`, stages a copy and applies the patch into `.cache/staged` for the host test | Verdict: SIMPLIFY (or DELETE with test_hidden_handle.py)
- Importers: none (README.md:20). Its only consumer is `test_hidden_handle.py` (reads `.cache/{baseline,staged}`). git grep `hidden-navigation-handle/prepare`: 0.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-32 | C3 | Gitiles fetch-verify loop duplicating `core-launcher/prepare.py:20-33` and `system-entry/fetch.py:17-41` (same base64 `?format=TEXT`, redirect check, size cap, symlink walk, sha check). | Use one shared `fetch_pinned(project, revision, rows, dest)` helper (see chunk X2). −15 lines. | Low |
| 2 | 17-18 | B3 | Builds URL then asserts `row['url'] == url`. | Drop `url` from manifest.json. | Low |
| 3 | 12-13 | B3 | `assert manifest['project'] == 'packages/apps/Launcher3'` and patch-hash check on our own file; `git apply --check` + after-hash check (lines 39-42) already prove the patch. | Keep the after-hash check; delete line 12. | Low |
| 4 | 33-42 | — | Staging only exists to feed `test_hidden_handle.py`. | If the test is deleted (its report), delete this script too; the image build applies the patch to the real tree. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| fetch loop | helper | 14-32 | `core-launcher/prepare.py:20-33`, `system-entry/fetch.py:17-41` | shared branding helper |
| symlink walk | helper | 20-22, 34-36 | `apply.py`, `system-entry/apply.py:30-33`, `system-entry/fetch.py:22-25` | shared helper |

## Proposed end state
Deleted with the test (preferred), else ~25 lines using the shared fetch helper.

## Verification
Hand-run only; no CI consumer.
