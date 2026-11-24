# specs/quint/refinement/native/GoogleBrowserReturnClaimTraces.java
- Lines: 193 | Kind: Quint refinement harness (Java; extends a template fixture into which method bodies sliced from the patched upstream `CloudSignInPlugin.java` are injected) | Verdict: PORT (upstream-owned code; keep model passing)
- Covers: model `GoogleBrowserReturnClaim` (live, native manifest): Google browser sign-in return: App Link capture and intent scrubbing, worker claim, resume and return-hint grace timers (1500 ms), foreign state, query-code as hint only, pending-record compare-and-exchange (missing/unreadable/replacement), scoped cancel, credential-intent supersession, expiry, cold result notice, exchange at most once; 23 schedules (20 named + 3 provider-error kinds). Duplicates: `test/fixtures/google-browser-auth/native-sign-in.test.mjs` runs the same `CloudSignInChainTest` template with the same sliced methods as a regression; `test/quint-google-browser-return-claim.test.mjs` is the only runner of this campaign (the native aggregate lists only its obligation, `index.mjs`).
- Callers/importers: `google-browser-return-claim.mjs` (`checkGoogleBrowserReturnClaim`), main class `ai.eliza.auth.cloud.GoogleBrowserReturnClaimTraces`; depends on `test/fixtures/google-browser-auth/{chain-methods.mjs, ai/eliza/auth/cloud/CloudSignInChainTest.java.txt, upstream-base.json}` and patched `packages/auth/android/.../TestRegistration.java`.

## How it is tied to product code
- Product code is **upstream** `vendor/eliza/packages/auth/android/src/main/java/ai/eliza/auth/cloud/CloudSignInPlugin.java`
  with this repo's `patches/eliza/**` applied by `preparePatchedNative`.
- **Text slice (T10)**: `chainMethods()` cuts six spans by literal start/end anchors (`ACTUAL_CREDENTIAL_IDENTITY`,
  `ACTUAL_CALLER_REQUEST`, `ACTUAL_CANCEL`, `ACTUAL_START_CODE`, `ACTUAL_CALLBACK`, `ACTUAL_BROWSER_LIFECYCLE`,
  `ACTUAL_BURN`, …) and `google-browser-return-claim.mjs:observedChain` rewrites them with `replaceOnce` on
  `'  run(() -> {'`, `'     main.postDelayed(() -> {'`, `'  main.postDelayed(() -> {'`, `'try { worker.execute(() -> {'`,
  then injects `observe*` ports before `' static void check(boolean value'` in the template.
- Harness overrides the injected `observe*` hooks to label each queued `Runnable` (identity maps), so observation is precise.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver | T10 | Seven-anchor slice plus five whitespace-exact rewrites of patched upstream source; any upstream reformat or patch change breaks it. | Upstream follow-up (D14): give `CloudSignInPlugin` injectable `Executor`/`Handler` ports (the observation seam) and compile it whole with plain-JVM Capacitor stubs. Until then keep as is; it is the only refinement of this model. | High if attempted locally: AGENTS.md forbids editing `vendor/eliza`; the patch would grow. |
| 2 | 21-39 | — | Constructor seeds `Attempt` fields directly (`google`, `browserLaunched`, `credentialGuard`, …), pinning internal field names of the sliced code. | Same upstream seam fixes it. | Medium |
| 3 | campaign | T4 | The chain regression `native-sign-in.test.mjs` compiles the same template and slices. | Keep the chain regression only for cases not in these 23 schedules (see its report). | None |
| 4 | 127-161 | — | String step DSL (`"receive success"`) is compact and readable. | None | None |

## Proposed end state
Model and schedules unchanged. Listed as an upstream follow-up: expose observation seams in `CloudSignInPlugin` so the
harness compiles the whole patched class instead of injected slices; then `chain-methods.mjs` and the template go.
