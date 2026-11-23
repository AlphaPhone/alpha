# android/aosp/branding/keyboard-dictation/source-inputs.json
- Lines: 34 | Role: pins four upstream source files (LatinIME, InputMethodManagerService, InputMethodInfoUtils) that the README cites as evidence; no patch | Verdict: DELETE
- Importers: none. git grep `keyboard-dictation/source-inputs` and for its hashes: 0 readers. (`source-inputs.json` hits in `scripts/stage-alpha-os-branding.py:8`, `scripts/fetch-alpha-os-preset-inputs.py:10` are `provision/source-inputs.json`.) Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | B5 / A7 | `"purpose": "Read-only verification of existing stock shortcut ... no framework Java patch"` — but no tool performs that verification. Reference record with no consumer. | Delete; keep the two revision pins as text in the README section (they already appear in README.md:7,25). | None |

## Local types and helpers
None.

## Proposed end state
Deleted (−34 lines).

## Verification
None reads it.
