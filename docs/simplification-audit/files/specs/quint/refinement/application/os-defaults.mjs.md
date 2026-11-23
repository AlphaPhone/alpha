# specs/quint/refinement/application/os-defaults.mjs
- Lines: 185 | Kind: Quint refinement harness on the host JVM (Kotlin + Java) for AOSP image code | Verdict: KEEP
- Covers: the AOSP image's Quick Settings default/migration (`AlphaQsDefaultsPolicy.java`, version 2→3 tile identity replacement, layout/version write ordering, owner layouts retained), the shared-storage appop default grant (`grantAlphaSharedStorageDefault` from the patch) and the core-launcher/storage identity predicates. Model `OSDefaults.qnt`. D17 explicitly keeps the QS migration.
- Duplicates: `test/aosp-fresh-presets.test.py` exercises some of the same policy classes (T4, partial). Callers: `test/quint-os-application-refinement.test.mjs`, `index.mjs:111`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-21, 162-164 | T10 (AOSP) | `method(source, anchor)` brace-matches Kotlin/Java methods out of the reconstructed AOSP file and the patch text. Unlike product code this cannot be imported (AOSP SystemUI is not built here), and the anchors are method signatures, not comments. | Keep; document that the anchor set is the patch contract. | Low. |
| 2 | 147-149 | B5 | Inputs include `index.mjs`, `test/quint-application-refinement.test.mjs`, `verification-metadata.xml`, scripts not executed; the wrapper test even asserts those paths appear (`test/quint-os-application-refinement.test.mjs`). | Drop non-executed inputs and that assertion. | Low. |
| 3 | 154-158 | — | Hash checks of policy files and patch against `core-launcher/manifest.json` are the patch's own integrity rule (shared with `prepare-patched-native.ts`). | Keep one owner: let `prepare-patched-native.ts` export the verification and call it. | Low. |
| 4 | 22-144 | D8 | ~120 lines of generated Kotlin/Java probe in template strings, single-line style. | Move probes to `.kt`/`.java` files under `specs/quint/refinement/application/os/` with placeholders, readable and lintable. | Low. |
| 5 | 43-46 | A1? | `legacyTile` `ai.elizaresearch.alphaphone/...` replacement scenarios. Kept by D17 (image migration, not app data). | None. | — |

## Proposed end state
Same campaign (13 traces), probes in real source files, one integrity helper shared with `prepare-patched-native.ts`, no hashing of unrelated files. Runs only in a lane filtered on `android/aosp/branding/**` and this folder (needs JDK + Kotlin compiler).
