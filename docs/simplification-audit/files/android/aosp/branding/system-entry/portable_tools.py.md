# android/aosp/branding/system-entry/portable_tools.py
- Lines: 30 | Role: Finds an installed JDK binary (`JAVA_HOME`, macOS `java_home -v 17+`, PATH) and an Android API jar (`ALPHA_ANDROID_API_JAR`, SDK env vars, default SDK dirs). | Verdict: MOVE to `android/aosp/branding/packet.py` (or `android/aosp/branding/tools.py`)
- Importers: `system-entry/test_native_plan.py:3`; `hidden-navigation-handle/test_hidden_handle.py:5-6` (via `sys.path.insert(0, ROOT.parent/'system-entry')`); `test/aosp-fresh-presets.test.py:7-8` (same `sys.path` hack). None of these tests is run by a runner.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-30 | D11 | A shared module hidden inside one packet, reached by other packets and `test/` through `sys.path.insert` hacks. | Move to `android/aosp/branding/packet.py` together with the fetch/admit helpers; importers add one `sys.path` entry for `android/aosp/branding` (or the tests move under `test/` and import by path). | Low. |
| 2 | 5-19 | C3 | JDK discovery twin: `test/fixtures/jvm-tools.mjs` (used by Quint harnesses, e.g. `os-provisioning.mjs:6`) and `scripts/ci/calendar-bridge.py` (`java_home`). | Keep one Python version here; the JS one serves Node. No cross-language merge. | - |
| 3 | 9, 19, 30 | B1 | Raises clear `RuntimeError`s; fine. | Keep. | - |

## Local types and helpers
| `java_binary` | helper | 5-19 | `scripts/ci/calendar-bridge.py` (java_home lookup), `test/fixtures/jvm-tools.mjs` | `android/aosp/branding/packet.py` |
| `android_api_jar` | helper | 21-30 | none in Python | same |

## Proposed end state
File moved (30 lines) into the shared packet module.

## Verification
Manual: run `test_native_plan.py`, `test_hidden_handle.py`, `test/aosp-fresh-presets.test.py` after the import change (or wire them into `test/python-suites.test.mjs` with skips).
