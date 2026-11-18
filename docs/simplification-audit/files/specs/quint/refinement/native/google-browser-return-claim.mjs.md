# specs/quint/refinement/native/google-browser-return-claim.mjs
- Lines: 77 | Kind: Quint refinement driver over **text-injected** patched upstream `CloudSignInPlugin.java` (method spans spliced into a test template, observation seams via `replaceOnce`) | Verdict: PORT (upstream follow-up)
- Covers: Cloud sign-in App Link return: worker claim, resume/hint grace timers, scoped cancel, pending-record CAS, first exchange dispatch; model `GoogleBrowserReturnClaim` (native manifest, live). Duplicates: the "packaged source regression" built from the same template (`test/fixtures/google-browser-auth/`, see its report). Callers/importers: `test/quint-google-browser-return-claim.test.mjs`, native aggregate `index.mjs:42,170` (T4).

## Text pins (T10)
- `chainMethods(plugin)` from `test/fixtures/google-browser-auth/chain-methods.mjs` cuts seven method spans (`ACTUAL_CALLBACK`, `ACTUAL_BROWSER_LIFECYCLE`, `ACTUAL_BURN`, `ACTUAL_CANCEL`, …) out of the staged patched `packages/auth/android/.../cloud/CloudSignInPlugin.java` and injects them into `CloudSignInChainTest.java.txt`.
- Five whitespace-exact seams (lines 25-33, 65-66): `'  run(() -> {'`, `'     main.postDelayed(() -> {'`, `'  main.postDelayed(() -> {'`, `'try { worker.execute(() -> {'`, `' static void check(boolean value'`.
- Compiles every other `.java` in the staged package except `CloudSignInPlugin.java` and `NativeGoogleCredential.java`, plus upstream `TestRegistration.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-35, 65-66 | T10 | Indentation-exact text surgery on upstream source; any upstream reformat breaks it. | Upstream follow-up (D14): give `CloudSignInPlugin` injectable worker/main executors (it already routes through `run`/`worker`/`main`) so the harness wraps them instead of rewriting text; then compile the whole plugin with Capacitor stubs. | Medium |
| 2 | 17-20 | C3 | Local `replaceOnce`; the same helper exists in other harnesses (ci-and-formal §4 lists `replaceOnce` twice, `between` 12×). | `refinement/support.mjs`. | None |
| 3 | 52-59 | B5 | ~15 inputs hashed for receipts, including all patch files. | With the receipt decision. | None |
| 4 | — | T4 | Run by its test and the aggregate. | Aggregate goes. | None |

## Proposed end state
Import-free JVM harness compiling the whole staged plugin with executor ports; no template or seam strings. Until the upstream
seam exists, keep as is (model is live and passing) and list it in the upstream follow-ups.
