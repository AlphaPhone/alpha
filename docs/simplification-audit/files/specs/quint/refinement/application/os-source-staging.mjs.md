# specs/quint/refinement/application/os-source-staging.mjs
- Lines: 118 | Kind: Quint refinement harness running the real Python staging script with one injected observer (T10, mild) | Verdict: KEEP
- Covers: `scripts/stage-alpha-os-branding.py` `build_plan` asset admission (payload/report/geometry drift refused) and `apply_plan` (all preimages checked before mutation, backup before each replace, failure or read-back corruption never reports success). Model `OSSourceStaging.qnt`.
- Duplicates: `test/aosp-fresh-presets.test.py` loads the same script module for other checks (no overlap on `apply_plan` found). Callers: `test/quint-os-application-refinement.test.mjs`, `index.mjs:113`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 107-109 | T10 | Inserts `observe('all-preimages-admitted')` before the anchor `    for row in rows:\n        if not row['changed']: continue`. | Python can be imported: give `apply_plan` an optional `on_admitted` callback parameter, or observe "no write before admission" from the monkey-patched `os.replace` alone and drop the injection. | Low. |
| 2 | 11-99 | D8, C7 | 90-line Python runner inside a JS template string. | Move to `specs/quint/refinement/application/os/stage_probe.py`. | Low. |
| 3 | 102-104 | B5 | Hashes non-executed inputs. | Drop. | Low. |

## Proposed end state
Python probe as a file that imports the script, 7 traces, no source rewrite; lane filtered on `scripts/stage-alpha-os-branding.py` and `android/aosp/branding/**`.
