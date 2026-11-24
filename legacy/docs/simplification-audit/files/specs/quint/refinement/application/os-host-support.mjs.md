# specs/quint/refinement/application/os-host-support.mjs
- Lines: 80 | Kind: shared harness helper (Android stub classes + javac/java runners) | Verdict: KEEP, MERGE runtime discovery
- Covers: no behaviour; provides `materialize`, `compileJava`, `javaJson` and `androidPorts(identity)` (≈40 hand-written Android framework stubs) for `os-defaults.mjs`, `os-provisioning.mjs`, `os-source-staging.mjs` (only importers; all KEEP, so it survives).
- Duplicates: Java discovery/compile helpers also in `refinement/native/java.mjs`, `refinement/native/reminder-delivery.mjs:69-72` and `specs/quint/native/conformance.mjs` (C3, research ci-and-formal §helpers). Android stubs overlap the host-javac stubs used by native refinement.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-19 | C3 | `compileJava`/`javaJson` re-implement `java.mjs` runners (timeouts, classpath, org.json jar). | Use `refinement/native/java.mjs` (or move both into one `refinement/support/jvm.mjs`). | Low. |
| 2 | 7 | C3 | Another `root` constant (`support.mjs`, `notes-files-media-itf.mjs repositoryRoot`, `assistant-model-traces.mjs`). | One export. | Low. |
| 3 | 23-79 | D8 | Android stubs as one-line Java strings. | Move to real `.java` stub files under a `stubs/android/` folder shared with native harnesses. | Low. |

## Proposed end state
Thin module: Android stub folder on disk + calls into one JVM helper.
