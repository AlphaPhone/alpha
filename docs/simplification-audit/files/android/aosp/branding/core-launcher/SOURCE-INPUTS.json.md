# android/aosp/branding/core-launcher/SOURCE-INPUTS.json
- Lines: 26 | Role: pinned frameworks/base revision, baseline SHA-256 and gitiles URL of the four AOSP files `prepare.py` edits | Verdict: SIMPLIFY
- Importers: `prepare.py:12` (`PIN`). Text/path pins: none outside prepare.py (other `SOURCE-INPUTS.json` hits are system-entry's own file). `scripts/stage-alpha-os-branding.py` reads `manifest.json`, not this file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8,13,18,23 | B3 | Each row stores `url`, which `prepare.py:28-29` rebuilds from `revision`+`path` and asserts equal (`assert row['url'] == expected`) — self-validation of our own constant. | Drop the four `url` fields; `prepare.py` builds the URL. -4 lines here, -2 in prepare.py. | Low |
| 2 | 7,12,17,22 | C6 | `beforeSha256` values are repeated in `manifest.json:11,24,36,48` (written by prepare.py from the same bytes). | Acceptable (input pin vs generated output record); could fold into manifest only if prepare.py stops regenerating manifest. Keep. | — |

## Local types and helpers
None.

## Proposed end state
~22 lines: `project`, `revision`, `files[{path, beforeSha256}]`.

## Verification
`python3 prepare.py --fetch` must reproduce byte-identical `alpha-core-launcher.patch` and `manifest.json`.
