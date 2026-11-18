# test/aosp-fresh-presets.test.py
- Lines: 179 | Kind: mixed: JVM run of real image code (test 1), tooling integration needing fetched AOSP inputs (tests 2-4), source-text (test 5), Java method transplant (test 6) | Verdict: REWRITE: keep tests 1-4 registered in the single Python runner (`test/tooling/python.test.mjs`), skipped with a reason when the fetched inputs are absent; DELETE tests 5 and 6
- Covers: `AlphaFreshSetupPolicy` fresh-setup/IME decisions; `scripts/stage-alpha-os-branding.py` plans byte-exact Provision/core-launcher patches, copies overlays exactly, refuses unreviewed or late-drifting sources; setup icon reuses reviewed bytes. Duplicates: the Quint model that pins `scripts/stage-alpha-os-branding.py` (`scripts/quint-lib.ts:10` `runtimeScriptPaths`) replays staging; no other test runs `AlphaFreshSetupPolicy`. Callers/importers: **no runner**. Only named in `android/aosp/branding/provision/README.md:72` and `keyboard-dictation/README.md:36`; not in `npm test` (glob is `*.test.mjs|ts`) nor `test/python-suites.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | T9, A7 | Orphan: never run by `npm test`, `verify` or CI. It also cannot run in a clean checkout: `INPUT` defaults to `android/aosp/branding/provision/.cache` and `core_baseline` reads `core-launcher/.cache/baseline`, neither of which exists (checked). | Register in the Python runner; `skipUnless(INPUT.exists())` on tests 2-4 so test 1 always runs. | Medium: today nothing enforces it, so it may already be red. Run it once with inputs before relying on it. |
| 2 | 17-46 | - | Real execution of the image-side policy with a fake `ImePort`; table-driven; worth keeping. | Keep. | none |
| 3 | 61-127 | - | Real staging plan/apply over copied inputs, including refusal before any write. | Keep (opt-in on inputs). | none |
| 4 | 115-116 | T1 | `assertNotIn('android:viewportWidth="120"', source of the staging script)`. | Delete. | none |
| 5 | 129-146 | T1 | `assertIn` over `AlphaFreshPresets.java`, `AlphaWelcome.java`, and AOSP `Settings.java`/`InputMethodManager.java` text, including exact statements and a `count('completed.run()')==1`. | Delete. | Low: home-role verification behaviour is only provable on an image boot. |
| 6 | 148-177 | T2 | Brace-matches `fail(int)` out of `AlphaWelcome.java` and compiles it into a stub class. | Delete; if wanted, extract the failure→Settings action mapping into `AlphaFreshSetupPolicy` (pure) and add rows to test 1. | low |
| 7 | 2 | D8 | Statement soup (one-letter indentation, `;`-joined statements). | Formatter pass when moved. | none |

## Proposed end state
About 110 lines: the JVM policy test always runs; three staging tests run when `ALPHA_FRESH_PRESET_INPUTS` (or the cache)
is present and otherwise skip with a reason. Executed by the one Python runner. No source-text assertions or transplants.
