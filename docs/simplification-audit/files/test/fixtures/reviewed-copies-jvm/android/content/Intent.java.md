# test/fixtures/reviewed-copies-jvm/android/content/Intent.java
- Lines: 2 | Kind: fixture (host-JVM Android stub for a Quint refinement harness) | Verdict: KEEP
- Covers: Only FLAG_GRANT_READ_URI_PERMISSION=1. Duplicates: `test/fixtures/app-update-jvm/android/{content/Context,content/Intent,net/Uri}.java` declare the same classes with incompatible members (app-update `Intent` is a full intent model, `Context` has package-manager members); not mergeable without a superset stub. Callers/importers: only `specs/quint/refinement/native/reviewed-copies.mjs:10-12` (compiled with `android/.../ReviewedCopies.java`, `AlphaMailFileProvider.java`, upstream `ReviewedFileHandoff.java`/`DocumentExport.java`), registered in `specs/quint/refinement/native/index.mjs:39,192`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | The harness compiles and runs the real Java (`ReviewedCopies`, `AlphaMailFileProvider`) and checks ITF traces of model `ReviewedCopies`; this is the intended "import and run the real module" shape, not a text slice. Product code is live (`AndroidManifest.xml:105` provider). | None. | — |

## Proposed end state
Unchanged. Keep while the `ReviewedCopies` model and its native refinement harness stay live.
