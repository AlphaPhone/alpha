# specs/quint/refinement/native/runtime-update-pause.mjs
- Lines: 93 | Kind: Quint refinement harness, Java; **slices product text** (T10) | Verdict: PORT
- Covers: model `RuntimeUpdatePause` (live) — durable update journal + `UpdatePause` release authority across two fresh JVMs. Duplicates: the journal itself is also exercised by `update-barrier.mjs`/`update-composition.mjs`; `test/quint-runtime-update-pause-refinement.test.mjs` re-runs this campaign (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-41 | T10 | `extractWrapper` reads `AlphaDevicePlugin.java` as text and cuts: `' static final class UpdatePause {'` → `' private static final class UpdateActivation'`; regex `/ static String hex\(byte\[\] digest\)\{[^\n]+/` (one-line body); `' static String appSigner('` → the comment `" /**\n  * A session's binding:"`; sanity `signer.includes('signingRoot')`. Then wraps them in a synthetic `final class AlphaDevicePlugin` with `static Object activation`. All anchors exist today (checked). | With U-A1 (`update/AppUpdater.java` owns `UpdatePause` and static update state; `hex`→`AlphaUtil`), compile `AppUpdater.java` and `AlphaUtil.java` whole. Product needs: `UpdatePause` package-visible, `appSigner(Context)` and `hex` reachable without `AlphaDevicePlugin`, and `activation` state behind an interface the harness can leave idle. | M |
| 2 | 59-61 | B5/C3 | Asserts the compiled vendor journal hash equals `upstreamNativeSource(root).read(...)`. Same pinned-blob check is hand-written in `update-composition.mjs:33-36`, `update-staging.mjs:158-160`, `settings-handoff.mjs:43`, `source-renewal.mjs:32-33`, `sms-dispatch.mjs:74-77`, `workflow-notice-delivery.mjs:39-41`. | One `assertPinnedUpstream(driverHashes, paths)` in `java.mjs` (or drop: `verify` already checks the submodule against `upstream.lock.json`). | L |
| 3 | 17-20,55-57 | B5 | `ElizaAgentService.java` and `CredentialShutdownLease.java` are hashed but not compiled. | Remove from `sources`. | L |
| 4 | 62-79 | – | Real temp-dir filesystem, two JVM pairs reopen one path: genuine integration behaviour, keep. Runtime: 14 JVM launches after one javac. | Keep. | – |
| 5 | 85 | – | Host-capability skips (`result.skip`) silently become receipt assumptions; on root/CI with different permissions the `symlink`/unreadable-dir cases may skip. | Keep but log skipped modes in the test output. | L |

## Proposed end state
Compile `update/AppUpdater.java` (plus `AlphaUtil`) and the pinned journal; no `extractWrapper`, no synthetic
`AlphaDevicePlugin`. Keep the fresh-JVM reopen traces and both obligations. Run from the native aggregate only;
lane = `update/**`, the journal's upstream path, `test/fixtures/app-update-jvm/**`, this file and its `.java`.
