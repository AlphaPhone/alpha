# specs/quint/refinement/native/java.mjs
- Lines: 59 | Kind: harness support (JDK and org.json discovery, compile-once/run-N JVM campaign, path constants) | Verdict: KEEP (MERGE the JDK/jar lookup with `test/fixtures/jvm-tools.mjs`)
- Covers: no product behaviour; every Java-backed native campaign runs through `javaTraceCampaign`. Duplicates: `test/fixtures/jvm-tools.mjs` exports `jsonJar`, `javaBinary`, `jvmTimeout` (120000, same value) with **different** discovery rules (Homebrew JDK path on darwin vs `/usr/lib/jvm/java-21-openjdk` here; jar found with/without `ALPHA_JSON_JAR`); `gmail-background.mjs`, `hosted-inbox.mjs`, `hosted-result-notices.mjs`, `keyboard-dictation-cloud.mjs` import `jsonJar` from the fixture while compiling through this module. ci-and-formal §4 also lists `reminder-delivery.mjs:69-72` and `specs/quint/native/conformance.mjs`. Callers/importers: ~60 files in this folder (grep `from './java.mjs'`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-31 | C3 | Second JDK/jar locator; two machines can pick different JDKs for host tests vs refinement. | Import `javaBinary`, `jsonJar` from one module (move `jvm-tools.mjs` lookup into a `scripts/lib/jvm.ts` or keep it in `test/fixtures` and import here). | Low |
| 2 | 18 | cost | `executable()` spawns `javac -version`/`java -version` on **every** campaign call (no memo). | Memoise per name. | None |
| 3 | 10-12 | C6 | `app`, `sense`, `voice` constants are redefined in `keyboard-dictation-cloud.mjs:12`, `current-sources.mjs:11`, `indicator-provider.mjs:6`, `live-capture.mjs:11`. | Import from here. | None |
| 4 | 36-43 | C3 | Child-process run/timeout/output wrapper duplicates `scripts/child-command.ts` (ci-and-formal §4). | Reuse. | Low |
| 5 | 45-46 | B5 | `captureReplayInputs` hashes jar, harness and sources before compile. | With the receipt decision. | None |
| 6 | 55-56 | D8 | Double blank line. | Formatter. | None |
| 7 | — | (new) | A shared `writeStubTree(dir, files)` belongs here (11 platform files re-implement it). | Add. | None |

## Proposed end state
`javaTraceCampaign`/`javaTraces` plus path constants and the stub-tree writer; JDK/jar lookup imported from the one shared locator, memoised.
