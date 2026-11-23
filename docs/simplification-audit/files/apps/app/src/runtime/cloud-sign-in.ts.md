# apps/app/src/runtime/cloud-sign-in.ts
- Lines: 74 | Role: Alpha binding of upstream `@elizaos/auth/auth/native-cloud-sign-in` — type aliases bound to `CloudEnvironment`, the extended `CloudSignInPort`, renamed parser re-exports, and Alpha's owner-facing `signInFailureMessage`. | Verdict: SIMPLIFY
- Importers: `cloud-protocol.ts:13`, `connection-ui.tsx:68`, `native-connection.ts:11` (type), `scripts/test-cloud-protocol.ts`, `scripts/test-connection-history.ts`.
  Text/path pins: `specs/quint/application/manifest.json` (pins `signInFailureMessage`), `specs/quint/{legacy,services}/manifest.json`, `specs/quint/legacy/sign-in/check-sign-in-refinement.mjs`, `test/cloud-sign-in-state.test.mjs`, `test/cloud-sign-in-network.test.mjs`, `test/connection-step-contracts.test.mjs`, `test/quint-connection-controller.test.mjs`, `test/sign-in-incomplete-queue.test.mjs`, `test/provider-key-release-drain.test.mjs` (all name `signInFailureMessage`), `test/support/feature-parity.mjs:490`, `scripts/prepare-client-features.ts:312` (lists the upstream source this file imports). Android instrumented tests reference the `cloud-sign-in` *copy*, not this path.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38, 42 | A7 | `CloudSignInFailureCode` and `CloudSignInGoogleMfaRequired` — 0 importers outside this file (grep -w). `CloudSignInFailureCode` is used only as a parameter type on line 57. | Delete `CloudSignInGoogleMfaRequired`; use `NativeCloudSignInFailureCode` directly on line 57. | None. |
| 2 | 64-74 | D4 | Pure renames: `authenticated`, `emailStarted`, `verified`, `googleOutcome` (bind `environment` generic only), `normalizeSignInCode = normalizeNativeSignInCode`, `validSignInEmail`, `signInReadiness`, `validSignInPhone`, and `CloudSignInError = NativeCloudSignInError` (52-53). | Callers (`cloud-protocol.ts`, `connection-ui.tsx`) import the upstream names directly (via the `@eliza/*` alias, D13); keep only the `CloudEnvironment`-bound type aliases that need the generic (39-43, 46). Deletes ~15 lines. | Low; quint/test transplants that stub `./cloud-sign-in` exports by name need updating (T2 — delete). |
| 3 | 44-51 | A1 | `savedSignInRecoveryStatus?()` / `restoreSavedSignIn?()` — "explicit recovery of the same product's saved pre-namespace credential" (AlphaCloudSignInPlugin "legacy production credential"). Package was renamed 2026-11-10 with empty data; research a–m P5 lists `legacySignInRecovery` as an A1 candidate. | Delete both port members and the `connection-ui.tsx` `legacySignInRecovery` UI (120, 3670-3672, 3880) and native methods — once the Android owner confirms no install path carries a pre-namespace credential. | Medium: `specs/quint/native/manifest.json`, `SavedSignInRecoveryReplay.java`, `test/legacy-cloud-recovery.test.mjs`, `recovery-restart-action.test.mjs`, `auth-copy-native-cutout.test.mjs`, `native-recovery-admission-order.test.mjs` pin it. |
| 4 | 47-48 | B2 / D5 | `cancelGoogleSignIn?()` — "Browser-host only"; implemented only by `browser/cloud-connection.ts:134` (dev host). | Move to a `DevelopmentCloudSignInPort` type next to the dev host (see `cloud-protocol.ts.md` #12). | Medium. |
| 5 | 58-62 | D10 | `return message === \`${serviceName} sign-in is unavailable right now. Try again.\` ? 'Unavailable' : message;` — behaviour keyed on matching upstream copy text; silently stops working if upstream rewords. | Check `code === 'unavailable'` (the code that produces that copy upstream) before calling `nativeCloudSignInFailureMessage`. | Low; verify copy parity with `test/cloud-sign-in-state.test.mjs`. |
| 6 | 22-37 | A8 | Header cites "owner directive 2026-10-14, #410". | Trim to what the binding does. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudSignInAuthenticated`, `CloudSignInEmailStarted`, `CloudSignInMfaRequired`, `CloudSignInGoogleOutcome` | type alias | 39-43 | upstream `NativeCloudSignIn*` | keep (environment-bound) |
| `CloudSignInPort` | type | 46-51 | upstream `NativeCloudSignInPort` | keep, minus legacy/dev members |
| `CloudSignInError` | const+type alias | 52-53 | upstream `NativeCloudSignInError` | import upstream |
| parser renames | const | 64-74 | upstream | import upstream |
| `signInFailureMessage` | helper | 57-63 | — | keep |

## Proposed end state
~25 lines: environment-bound type aliases, the product `CloudSignInPort`, and `signInFailureMessage` keyed on codes. Renames and legacy recovery members gone.

## Verification
`scripts/test-cloud-protocol.ts`, `test/cloud-sign-in-*.test.mjs` (most are T2 transplants slated for deletion), `test/cloud-protocol-error-copy.test.mjs`, Playwright `native-cloud-signin.spec.ts`, `signed-out-page.production.spec.ts`, `saved-signin-retry.production.spec.ts`; Android instrumented sign-in fixtures; quint application/services manifests in `npm run verify`.
