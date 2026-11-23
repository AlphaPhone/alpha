# android/aosp/branding/hidden-navigation-handle/PROVENANCE.json
- Lines: 37 | Role: narrative provenance record (motivation, scope, local test counts, pending gates) for the hidden taskbar handle patch | Verdict: DELETE
- Importers: none. git grep for `PROVENANCE.json` in this folder's context and for its keys (`triggeringEvidence`, `localVerification`): 0 readers. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | B5 / A7 | Provenance file nothing reads; `"localVerification": {"testCount": 5, "passed": 5, ...}` is a frozen receipt of a hand-run. | Delete. | None |
| 2 | 4-8 | C6 | Revision, source path, before/after/patch hashes duplicate `manifest.json:4-13` (the file `apply.py`/`prepare.py` actually read). | Covered by deletion. | — |
| 3 | 9-19 | A8 | Motivation and "unchanged" scope belong in README.md (already lines 3-13 say the same). | Covered by deletion. | — |

## Local types and helpers
None.

## Proposed end state
Deleted (−37 lines).

## Verification
None reads it; nothing to re-run.
