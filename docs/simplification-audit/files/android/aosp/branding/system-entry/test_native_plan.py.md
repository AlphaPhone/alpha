# android/aosp/branding/system-entry/test_native_plan.py
- Lines: 187 | Role: hand-run Python unittest over the fetched SystemUI baseline (`.cache/baseline`) and the prepared output (`.cache/staged`): patch applies, untouched files stay byte-identical, overlay flags, plus javac-compiled policy harnesses. | Verdict: DELETE (owner confirm) — alternatively wire into `test/python-suites.test.mjs`, but it cannot run without fetched AOSP inputs and an API-36 SDK.
- Importers: none. Not run by `scripts/run-node-tests.ts`, `test/python-suites.test.mjs` (which lists its suites explicitly, lines 25-30), any `.github` workflow or `package.json` script. Only `android/aosp/branding/system-entry/README.md:37,51` tells a human to run it. Imports `portable_tools` (sibling; also used by `hidden-navigation-handle/test_hidden_handle.py` and `test/aosp-fresh-presets.test.py`, so `portable_tools.py` stays). Text/path pins: README only.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A7 / T9 | Never executed by any runner (grep `test_native_plan`: only README). Its inputs (`DATA = ... ROOT / '.cache'`, line 6) do not exist in a checkout (`.cache` absent), so even a runner would need `fetch.py` + `prepare.py` first. | Delete file and README lines 37 and 51. The release check that matters (overlay digest) is already enforced by `scripts/stage-alpha-os-branding.py:112` and `test/aosp-fresh-presets.test.py:79-80`. | Low (manual-only coverage of the SystemUI patch is lost; the AOSP build itself compiles the patch) |
| 2 | 21-37 | B5 | Re-applies the patch and compares every staged byte to the `afterSha256` that `prepare.py:366` itself computed — re-validating the generator's own output. | Goes with #1. | — |
| 3 | 52-55, 101-118, 171-185 | T1 | Regex/substring assertions on Kotlin/Java source text (`'!canShowWhileLocked && !keyguardStateController.isUnlocked'`, `'Typeface.create("serif", Typeface.NORMAL)'`, forbidden-token list). | Goes with #1. | — |
| 4 | 66-70, 92 | T2 | Slices `ShadeHeader.kt` and the selection manager by literal markers (`'        // The reserved privacy band is otherwise empty.'`, `'    override fun getSelections()'`). | Goes with #1. | — |
| 5 | 120-169 | T3 | Writes a Java harness inline and compiles `AlphaSystemEntryPolicy`/`AlphaShadeWordmarkPolicy` with stub `R`, `Clock`, `AbstractOngoingPrivacyChip`. | Goes with #1. If the owner wants the 256-case policy truth table kept, move it into the AOSP tree as a host unit test next to the policy class (upstream SystemUI test layout), not here. | Low |
| 6 | 7 | B4 | `REPO = next(path for path in ROOT.parents if (path / 'app.config.json').is_file())` — repo-root discovery by marker file; a fixed `ROOT.parents[3]` is exact. | Moot after #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `sha(path)` | helper | 16 | SHA-256→hex (C3): `hidden-navigation-handle/test_hidden_handle.py`, `prepare.py`, `scripts/stage-alpha-os-branding.py` `digest`, ~40 in scripts | delete with file |
| `read(root,path)` | helper | 15 | trivial | delete with file |
| `canonical(node)` | helper | 17-18 | none found | delete with file |

## Proposed end state
File deleted (0 lines). README "Run" section keeps `fetch.py` and `prepare.py` only.

## Verification
Nothing runs it today, so no suite changes. Re-run `test/aosp-fresh-presets.test.py` (via its runner) and an AOSP staging dry run to confirm the overlay digest path is still covered.
