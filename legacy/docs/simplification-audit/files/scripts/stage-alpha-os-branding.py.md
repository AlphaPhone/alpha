# scripts/stage-alpha-os-branding.py
- Lines: 195 | Kind: OS-image source staging tool (Python, manual) | Verdict: KEEP, SIMPLIFY (replace `assert` guards; give the Quint harness a hook instead of a text splice)
- Covers: stages Alpha OS branding, core-launcher policy patch, first-run Provision changes and product.mk inclusion into an AOSP checkout, refusing any unreviewed preimage, with backups and a receipt. Duplicates: none in TS. Callers: run by hand per `android/aosp/branding/provision/README.md:39` and `core-launcher/README.md:9`; listed in `scripts/quint-lib.ts:10`; pinned by `specs/quint/application/manifest.json:3990`; driven by Quint harness `specs/quint/refinement/application/os-source-staging.mjs:10,106-111`; imported by `test/aosp-fresh-presets.test.py:9`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 20, 24, 29, 55-79, 86-91, 112, 121, 135-143, 150, 158, 168, 183, 188 | bug (CONFIRMED by language rule) | Every safety refusal (revision drift, symlink target, unsafe path, preimage drift, existing receipt) is a bare `assert`. Under `python3 -O` / `PYTHONOPTIMIZE` all are stripped and the tool writes into the AOSP tree unchecked. | One `def require(condition, message): if not condition: raise SystemExit(message)` and replace every `assert`. | Low change, high value. |
| 2 | 35-40, 124, 126-130 | A1 / D17 | `previous_activity` and `admitted-previous-sources.json` admit preimages from an earlier staging generation; D17 keeps the admitted-previous-sources record (Q-LEG-3). | Keep (owner decision D17); add a one-line comment saying which generation it admits. | — |
| 3 | 145-191 | D8 | Statement soup (`target=safe(...);actual=...if...else None`, 600-char receipt literal at 191). | One statement per line; receipt dict across lines. Do it after the Quint harness no longer splices text (see 4). | Low |
| 4 | 159-160 (anchor) | T10 | The Quint harness inserts an `observe(...)` call by matching the literal `"    for row in rows:\n        if not row['changed']: continue"`; any reformat breaks the model check. | PORT: add an optional `observe=lambda event: None` parameter to `apply_plan` and call `observe('all-preimages-admitted')` after the preimage loop; the harness imports the module via `importlib` (as `aosp-fresh-presets.test.py` already does) and passes its observer. | Low |
| 5 | 9 | C3 | sha256 lambda; Python twin of the TS helper. | Fine for a Python tool; no shared Python lib warranted. | — |
| 6 | — | T1 | `aosp-fresh-presets.test.py:115-116` reads this file's text (`assertNotIn('android:viewportWidth="120"', source)`). | Delete that assertion; the icon-bytes equality above it already covers the behaviour. | — |

## Proposed end state
Same behaviour, explicit `require` refusals that survive `-O`, readable layout, and an `observe` hook so
the OSSourceStaging model imports the module instead of rewriting its text. Owner confirmation that this
is still the OS staging step for fresh images/updates (README says so).
