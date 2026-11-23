# android/aosp/branding/system-entry/fetch.py
- Lines: 42 | Role: Downloads each `SOURCE-INPUTS.json` file from android.googlesource.com (`?format=TEXT`, base64), checks sha256, writes atomically into `.cache/baseline`; reuses existing correct files. | Verdict: MERGE into shared `packet.py`
- Importers: CLI only (README:35,49). No test runs it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-42 | C3 | Fourth copy of the same fetcher: `scripts/fetch-alpha-os-preset-inputs.py:11-28`, `core-launcher/prepare.py:20-33` (`--fetch`), `hidden-navigation-handle/prepare.py` (fetch block). Differences are only size cap (64 MiB vs 8 MiB), redirect check, atomic write and hash key name (`beforeSha256` vs `sha256`). | One `fetch(lock_path, dest)` in `packet.py` (keep this version: redirect check + size cap + atomic replace) used by all four; delete this file and the fetch blocks. | Low. |
| 2 | 12-14, 19-20 | B3 | Asserts the committed lock's own project, revision format and url shape. | Derive the URL instead of storing/asserting it (see SOURCE-INPUTS report). | None. |

## Local types and helpers
Shares `digest`/symlink-walk twins listed in `apply.py.md`.

## Proposed end state
Deleted; logic in `packet.py fetch()`.

## Verification
Manual fetch into an empty dir and a re-run (reuse path).
