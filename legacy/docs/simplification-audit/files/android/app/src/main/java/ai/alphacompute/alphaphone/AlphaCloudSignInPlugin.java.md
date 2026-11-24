# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInPlugin.java
- Lines: 153 | Role: Alpha's registration of the shared native Eliza Cloud sign-in client (`CloudSignInPlugin`): client id, deployments, storage names, credential slot adapter, credential-intent hooks — plus an owner-initiated "Restore saved sign-in" for a legacy pre-namespace production credential. | Verdict: SIMPLIFY (delete legacy recovery after owner decision)
- Importers: `MainActivity` registration, `AndroidManifest.xml` App Link comment; renderer `apps/app/src/runtime/cloud-sign-in.ts:49-50`, `connection-ui.tsx:2826-2833,3670-3672,3880` (`savedSignInRecoveryStatus`, `restoreSavedSignIn`, `legacySignInRecovery` UI), `native-connection.ts`; androidTest `CloudSignInAuthorizationInstrumentedTest`, `CloudSignInCallbackInstrumentedTest` (uses `REGISTRATION`, `PENDING_SLOT`, `receiptSlot`), `InboxFixtureActivity`, `InboxFixtureSignIn`, `PublicCloudTransportProbeInstrumentedTest`. Text/path pins: `scripts/browser-cloud-dev-bridge.ts`, `scripts/cloud-readiness.ts`, `scripts/test-cloud-protocol.ts`, `specs/quint/native/manifest.json:3577-3606`, `specs/quint/refinement/native/{SavedSignInRecoveryReplay.java,forward-replays.mjs,saved-sign-in-recovery.mjs}`, `specs/quint/refinement/services/{SignInCoordinatorTraces.java,SignInTestPorts.java,sign-in-coordinator.mjs}`, `specs/quint/services/manifest.json`, `test/cloud-deployment.test.mjs:42` (slices from `' static final String PENDING_SLOT'` to `' static String receiptSl'`), `test/cloud-sign-in-flow.test.mjs`, `test/connection-routes.test.mjs`, `test/legacy-cloud-recovery.test.mjs`, `test/login-surfaces.test.mjs`, `test/native-credential-read.test.mjs`, `test/quint-saved-sign-in-recovery.test.mjs`, `test/reset-cloud-revocation.test.mjs`, `test/reset-wiring.test.mjs`, `test/support/{feature-parity,login-surfaces}.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-29, 74-125, 127-130, 131-146, 69, 148-150 | A1 | "Restore saved sign-in ... for an eligible encrypted legacy production credential": `savedSignInRecoveryStatus`, `restoreSavedSignIn`, `recoveryLock/recoveryWorker/recoveryEpoch/recoveringLegacy/closed`, `supersedeRecovery()` and the four `start*/cancel` overrides plus `handleOnNewIntent` that exist only to supersede it. Reads the pre-namespace slot that the renamed package cannot hold (README/PRD: no migration). | Owner decision A1: delete (≈85 lines here) together with `LegacyCloudRecovery.java`, the legacy branches in `AlphaCredentialStore`, `ResetBeforeDispatch.readLegacyCloudSlot`, the renderer `legacySignInRecovery` UI in `connection-ui.tsx` and `cloud-sign-in.ts`, `test/legacy-cloud-recovery.test.mjs`, `test/quint-saved-sign-in-recovery.test.mjs`, the Quint saved-sign-in-recovery model and its manifest entries. | Medium: a pilot that installed an early `ai.alphacompute` build loses only the one-tap restore (data stays). |
| 2 | 131-132 | A8 | Two stacked Javadocs; the first ("A browser return may complete a sign-in into storage: it supersedes a restore as well.") is orphaned. | Delete with #1 (whole override goes). | None |
| 3 | 53 | D7 | `static String receiptSlot(CloudSignInEnvironment)` has no production caller (grep main: 0); used by `CloudSignInCallbackInstrumentedTest:93` and as the slice end marker in `test/cloud-deployment.test.mjs:42`. | Test can call `REGISTRATION.receiptSlot(env)`; delete the method and move the slice marker. | Low |
| 4 | 56-64 | C4 (P7) | Anonymous `CloudCredentialSlots` adapter (read/write/remove/compareExchange) onto `AlphaCredentialStore`. | `AlphaCredentialStore.asSlots()` variant implementing the upstream interface. | Low |
| 5 | 136-142 | D8 | Fully qualified `ai.eliza.auth.cloud.CloudSignInEnvironment` although it is imported (:5); 4 FQNs. | Imports (moot if #1 deletes the method). | None |
| 6 | 144 | B1 | `catch(Exception ignored){/* Unrelated intents never alter recovery ownership. */}` | Goes with #1. | — |
| 7 | 37-38, 46 | C6 | `"cloud-signin:v1:pending"`, `"/alphaphone/auth/callback"`, `"cloud-signin:v1:ack:"`, `"cloud:"`: installed names; `CALLBACK_PATH` also in `AndroidManifest.xml:143`. | Keep values. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `CloudCredentialSlots` | adapter | 58-63 | P7 slot adapters (12+) | `AlphaCredentialStore.asSlots()` |
| `recovery(task,call,refused)` | helper | 85-87 | `AlphaDevicePlugin.diagnostics`, `AlphaActionJournalPlugin.clockWork`, `AlphaConnectionPlugin.submit` | base-plugin `background` (deleted anyway with #1) |
| `receiptSlot` | helper | 53 | `CloudSignInConfig.receiptSlot` | delete |

## Proposed end state
~60 lines: `PENDING_SLOT`, `CALLBACK_PATH`, `REGISTRATION`/`registration(testMocks)`, the `registration()`, `credentials(guard)`, `withCredentialRead`, `reserveCredentialCommit` overrides. No recovery state, no lifecycle overrides.

## Verification
`CloudSignInCallbackInstrumentedTest`, `CloudSignInAuthorizationInstrumentedTest`; `test/cloud-sign-in-flow.test.mjs`, `test/cloud-deployment.test.mjs`, `test/login-surfaces.test.mjs`, `test/reset-cloud-revocation.test.mjs`; Quint sign-in-coordinator refinement; renderer sign-in Playwright journeys; `npm run verify`.
