# android/aosp/branding/provision/admitted-previous-sources.json
- Lines: 11 | Role: sha256 allow-list of *older* versions of `AlphaWelcome.java`, `AlphaAppearance.java` and `strings.xml` that staging may overwrite in an already-staged Provision tree. | Verdict: DELETE (owner confirm)
- Importers: `scripts/stage-alpha-os-branding.py:126-130` (`previous.get(name, [])` passed as allowed preimages). No test or spec reads it (grep `admitted-previous-sources`: 1 hit).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | A1 | Legacy reader: admits three historical file hashes (none matches a current file: current `AlphaWelcome.java` is d4a5a112..., listed c117af7e...). The companion `previous_activity()` (stage script 35-40, 124) admits an older injected `DefaultActivity`. Only needed to restage over a tree staged from the pre-rename sources. Staging already admits `prior_rows` from an explicit `--prior-receipt` (stage 146-150), which covers any tree staged with a receipt. | Delete this file and, in `stage-alpha-os-branding.py`, lines 35-40, 124, 126 and the `previous.get(...)` arguments at 129-130. Restaging an old tree then needs `--prior-receipt` or a fresh checkout. | Low if no owner tree staged before 2026-11-10 is still being updated in place (owner question). |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
Quint `OSSourceStaging` (`specs/quint/refinement/application/os-source-staging.mjs`) drives the stage script; re-run it. Manual `test/aosp-fresh-presets.test.py`.
