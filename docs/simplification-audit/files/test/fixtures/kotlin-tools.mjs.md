# test/fixtures/kotlin-tools.mjs
- Lines: 61 | Kind: test support + CI provisioning script (downloads and checksums Kotlin compiler jars, compiles Kotlin on the host JVM) | Verdict: KEEP (needed by two live Quint harnesses); MOVE to `scripts/ci/host-kotlin.ts` (provisioning) + `test/support/jvm.mjs` (`compileKotlin`)
- Covers: compiling product/upstream Kotlin for host-JVM refinement. Duplicates: none in repo (Gradle does the same in the Android build). Callers/importers: `specs/quint/refinement/application/os-defaults.mjs`, `specs/quint/refinement/native/browser-underlay.mjs` (`compileKotlin`/`kotlinJars`); CLI `node test/fixtures/kotlin-tools.mjs --prepare` in `.github/workflows/android.yml:62` and `.github/workflows/browser.yml:57`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 58-61 | D11, T9 | A CI provisioning entry point lives in `test/fixtures` and is invoked from two workflows (tests-host.md item 22). | Move the `--prepare` CLI to `scripts/ci/` (or the shared composite setup action, P5); keep `compileKotlin` with the JVM support module. | Low: update both workflow lines. |
| 2 | 22-28 | B5 (acceptable) | Reads pins from `android/gradle/verification-metadata.xml` by string splitting. This is real supply-chain verification of downloaded jars, not ceremony; keep. String-split XML parsing is fragile but stable format. | Keep; optionally a tiny regex per component. | Low. |
| 3 | 29-31 | C3 | Local `sha256` of file bytes; one of ~40 script copies. | Use `scripts/lib` hash helper after the move. | None. |
| 4 | 51 | D10 | `[jars[1], jars[6]]` picks stdlib and annotations by index into `modules`. | Look up by name. | None. |
| 5 | — | P3 | Both `android.yml` and `browser.yml` run the prepare step; only lanes that run the two Kotlin harnesses need it. | Run it only in the Quint lane that executes `os-defaults` / `browser-underlay`. | Low. |

## Proposed end state
`scripts/ci/prepare-host-kotlin.ts` (download + verify, invoked once by the Quint lane's setup) and `compileKotlin`
inside `test/support/jvm.mjs`, looking jars up by name. No CI entry point under `test/fixtures`.
