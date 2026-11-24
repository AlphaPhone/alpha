# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReadinessEpoch.java
- Lines: 18 | Role: main-thread generation/sequence counter correlating one readiness probe per document for `StartupDocumentProbe`. | Verdict: MERGE into `android/app/src/androidTest/java/ai/alphacompute/alphaphone/StartupDocumentProbe.java`
- Importers: 1 — `StartupDocumentProbe.java:16` (`new ReadinessEpoch()`), uses `navigated/generation/issue/complete/close` (`:24,32,48,50,66`). StartupDocumentProbe is used by ActionJournal, AppNavigation, StartupReadiness, WebViewTestDriver. Text/path pins: none (grep in test/, specs/, scripts/: 0).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-18 | D7 / C4 | A top-level class with one user; the "staleness/epoch fence" shape is one of ~30 such fences (catalogue C4). | Move it into `StartupDocumentProbe` as a `private static final class` (or inline the three fields). | none |
| 2 | 17 | B4 | `close()` (called once at `StartupDocumentProbe.java:66`) sets an inner `closed` that duplicates the probe's own `closed` flag, which already short-circuits every `issue`/`complete` call site (`:43,:50`). | When nesting, drop the inner `closed` and `close()`; the probe's flag is sufficient. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReadinessEpoch` | class | 4-18 | product `NativeReadEpoch.java` (main, test-only per research) has the same generation idea | nested in `StartupDocumentProbe` |

## Proposed end state
File deleted; ~12 lines nested in `StartupDocumentProbe`. 0 lines here.

## Verification
Everything that goes through `StartupDocumentProbe` (`AppNavigation.liveMode`, `WebViewTestDriver.navigateHostDocument`): StartupReadiness (DEFAULT class, `-e startupReadiness 1`), ActionJournal, and any journey calling `AppNavigation.liveMode`.
