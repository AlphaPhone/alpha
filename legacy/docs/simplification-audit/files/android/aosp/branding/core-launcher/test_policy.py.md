# android/aosp/branding/core-launcher/test_policy.py
- Lines: 221 | Role: hand-run unittest suite: compiles a sliced `updateAppItems` method with Kotlin fakes, javac predicate matrices for the three policies, patch inventory + text assertions | Verdict: DELETE (or owner keeps test 1 only, wired into CI)
- Importers: none. git grep `test_policy`: 0 hits; not in `scripts/run-node-tests.ts`, `test/python-suites.test.mjs` or `.github/workflows` (confirmed; research android.md:402). Requires `.cache/baseline` from `prepare.py --fetch` and kotlinc or a populated Gradle cache.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 / A7 | Never run by any runner; READMEs do not even name it. | Delete the file. | Low |
| 2 | 126-168, 170-186 | T4 | Predicate matrices for `AlphaCoreLauncherPolicy.protects`, `AlphaQsDefaultsPolicy.migrate/shouldMigrate`, `AlphaSharedStoragePolicy.shouldGrant` duplicate `specs/quint/refinement/application/os-defaults.mjs:93,135,140` which runs in CI via `test/quint-os-application-refinement.test.mjs`. | Delete. | None |
| 3 | 188-219 | T1 / T4 | `assertIn('if (!coreLauncher && isStoppableApp(packageName))', fgs)` etc. — source-text assertions on patch output; hash checks duplicate `scripts/stage-alpha-os-branding.py:56-78` and `os-defaults.mjs:154-155`. | Delete. | None |
| 4 | 38-124 | T2 | Slices `updateAppItems` between `'    private fun updateAppItems(\n'` and `'    /** Must be called on the background thread. */'`, wraps it in hand-written fakes and runs it. Only coverage of the FGS hide/restore transition. | Delete (owner wants e2e only); the real proof is a SystemUI build + device check. If owner keeps it, move to `test/` and wire into `test/python-suites.test.mjs` with a skip when kotlinc is absent. | Medium (loses the only FGS transition check) |
| 5 | 11, 13-35 | C3 | Own JDK discovery with a hard-coded `/opt/homebrew/opt/openjdk@21/...` default, while `system-entry/portable_tools.py:java_binary` exists for exactly this. | Moot if deleted; else use `portable_tools.java_binary`. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `JDK` / `kotlin_compiler` | helper | 11-35 | `system-entry/portable_tools.py:java_binary` | delete |
| Kotlin/Java fakes | test fixtures | 53-112 | `test_hidden_handle.py` STUBS (different classes) | delete |

## Proposed end state
Deleted (0 lines). Alternative: ~95 lines (test 1 only) moved to `test/aosp-core-launcher-fgs.test.py`, wired into python-suites.

## Verification
After deletion: `node --test test/quint-os-application-refinement.test.mjs` still covers the policy predicates; nothing else referenced this file.
