# specs/quint/native/GoogleBrowserReturnClaim.qnt
- Lines: 130 | Kind: Quint model (live; models upstream-only Java packaged into the APK) | Verdict: KEEP for now; MOVE upstream (D14 follow-up) and gate on `upstream.lock.json`
- Covers: one prepared Google browser sign-in attempt: a matching callback claims the attempt once and survives resume/hint grace timers, foreign or invalid callbacks do not, cancel/close fence queued results, a cold return has no credential authority, a superseded credential slot cannot consume the pending record. Duplicates: `services/IdentitySession.qnt` models the Alpha sign-in session at a coarser level (`callback(token)`); Android instrumentation `CloudSignInCallbackInstrumentedTest.java` drives the installed path. Callers/importers: `quint:check` (7 runs); `specs/quint/refinement/native/google-browser-return-claim.mjs` + `GoogleBrowserReturnClaimTraces.java` + `test/fixtures/google-browser-auth/chain-methods.mjs`, run from `refinement/native/index.mjs:170`; obligation `index.mjs:203`; prose `refinement/native/google-browser-return-claim.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources` | §2.9 / P6 | All code sources are `vendor/eliza/packages/auth/android/.../CloudSignIn*.java` (packaged: `android/upstream-native-sources.json:6` lists `packages/auth/android`; `patches` is empty). Results can change only on a pin bump. | Gate model + harness on `upstream.lock.json`/`android/upstream-native-sources.json`; list as upstream follow-up (the model belongs next to `CloudSignInPlugin`). | Low |
| 2 | harness `google-browser-return-claim.mjs:16-34,65` | T10 | Observation is added by literal replacement inside the upstream plugin text: `  run(() -> {` → `observeCallbackWork(…)`, `     main.postDelayed(() -> {` → `observeGrace("hint", …)`, `  main.postDelayed(() -> {` → `observeGrace("resume", …)`, `try { worker.execute(() -> {` → `observeCancelWork(…)`, and ` static void check(boolean value` as the injection point, with methods cut by `chainMethods(plugin)`. Cannot be ported here without editing `vendor/eliza`. | Upstream follow-up: give `CloudSignInPlugin` an injectable executor/handler port so the harness wraps the port instead of rewriting text. Keep as is meanwhile. | Low |
| 3 | 18-25 | — | `init` nondeterministically chooses live/expired; scenarios use `initWith`. Fine. | None. | — |
| 4 | 99-113 | — | Invariants are specific and meaningful (`ClaimHasWorker`, `ExchangeUsesConsumedRecord`). | None. | — |

## Proposed end state
Model unchanged. CI runs it only when the upstream pin or the native-source manifest changes. Upstream follow-up:
move model + harness to `packages/auth` upstream with an executor port replacing the text rewrites.
