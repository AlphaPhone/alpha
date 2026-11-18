# android/aosp/branding/hidden-navigation-handle/test_hidden_handle.py
- Lines: 123 | Role: hand-run unittest: patch/hash roundtrip, javac with Android stubs of the patched `StashedHandleView`, compile against API 36 jar, text assertions on the draw method, overlay XML assertions | Verdict: DELETE
- Importers: none; README.md:21 says run by hand. Not in `scripts/run-node-tests.ts`, `test/python-suites.test.mjs` or workflows (git grep `test_hidden_handle`: README only). Imports `system-entry/portable_tools.py` (`java_binary`, `android_api_jar`). Needs `.cache` from `prepare.py` and an Android SDK.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 / A7 | Never run by any runner. | Delete. | Low |
| 2 | 13-50, 74-95 | T2 / T3 | Compiles the patched class against 13 hand-written Android stubs (`android/view/View.java` fake with a `draws` counter) — unit test with stubs. | Delete; real proof is a Launcher3 build + device check. | Low |
| 3 | 59-72 | T4 | Patch + hash roundtrip duplicates `prepare.py:39-42` (same after-hash assertion). Line 65 slices the source by Javadoc text (T2/T10 pin on the patch). | Delete. | None |
| 4 | 103-109 | T1 | `assertNotIn('setVisibility', draw)` etc. — source-text assertions. | Delete. | None |
| 5 | 111-121 | T1 | Regex/XML assertions over `overlay/.../alpha-navigation.xml` and `home-back-keyboard.patch` text. | Delete; if the owner wants a guard, the overlay XML values belong in the staged-plan test `test/aosp-fresh-presets.test.py`. | Low |
| 6 | 2, 7 | A7 | `import re` unused; `REPO=next(p for p in ROOT.parents if (p/'app.config.json').is_file())` unused (grep in file: defined only). | Moot after deletion. | — |
| 7 | 5 | D13-like | `sys.path.insert(0,str(ROOT.parent/'system-entry'))` to import a sibling packet's tool module. | Moot; if shared helpers are created (X2), put them in `branding/` itself. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `COMMON` / `STUBS` | test fixtures | 13-50 | stub patterns in `test/aosp-capabilities.test.mjs:10-40` (research) | delete |
| `files_for` | helper | 52-56 | similar writer helpers in `system-entry/test_native_plan.py` | delete |

## Proposed end state
Deleted (−123 lines), together with `prepare.py` (−43) if nothing else needs `.cache/staged`.

## Verification
None reads it. After deletion check `system-entry/portable_tools.py` still has an importer (`system-entry/test_native_plan.py:3`, `test/aosp-fresh-presets.test.py:8` — confirmed by git grep).
