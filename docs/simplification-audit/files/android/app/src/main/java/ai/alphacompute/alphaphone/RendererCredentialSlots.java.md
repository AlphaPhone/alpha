# android/app/src/main/java/ai/alphacompute/alphaphone/RendererCredentialSlots.java
- Lines: 40 | Role: Alpha's slot-name data for the shared `SecureSlotPolicy` (native-only namespaces, compare-and-exchange slots, credential-intent slots) | Verdict: SIMPLIFY
- Importers: `AlphaConnectionPlugin` (requireAllowed ×4, compareExchangeAllowed, credentialSlot); androidTest `ConnectionInstrumentedTest` (`nativeNamespaces`), `CloudSignInCallbackInstrumentedTest`. Text/path pins: 14 tests incl. `test/renderer-slot-policy.test.mjs`, `test/renderer-slot-deployment-namespace.test.mjs`, `test/native-secure-slots.test.mjs`, `test/digest-pending-storage.test.mjs`, `test/legacy-cloud-recovery.test.mjs`, fixtures `ResidentResultTransportTest.java`, `legacy-cloud-recovery/{RendererRecoverySlotsTest,StoreIntegrationTest}.java`; `specs/quint/refinement/native/credential-coordinator.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-39 | D4 (P17) | Three forwards to `POLICY` (`requireAllowed`, `compareExchangeAllowed`, `credentialSlot`). | Callers use `RendererCredentialSlots.POLICY.requireRendererSlot(...)` etc. | Low (7 test files call `requireAllowed`). |
| 2 | 35-36 | A7 / D7 | `nativeNamespaces()` used only by `ConnectionInstrumentedTest` ("device isolation campaign"). | Expose via `POLICY` or delete with the test assertion. | None. |
| 3 | 13-23 | C6 (P6) | Third independent list of slot namespaces (also hard-coded in `AlphaCredentialStore.slotLimit` and in each owner class, e.g. `NativeDeletionCoordinator.JOURNAL`, `WorkflowNoticeTaps.SLOT`, `NativeNotificationSession.SLOT`, `SourceRenewalNotices.SLOT`). | One `Slots` registry (name, cap, renderer policy) that both this policy and `AlphaCredentialStore` read. | Medium: the lists must stay exact; renderer-slot tests pin them. |
| 4 | 18, 22 | A1 / A3 | `"cloud-signin"` (includes the legacy-recovery journal) and `"hosted-background"`/`"hosted-digests"` follow P5/P15 decisions. | Re-check after those deletes; namespaces with no remaining writer can go. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NATIVE_NAMESPACES` | const | 13-23 | slot-name constants across ~12 owner classes; `AlphaCredentialStore.slotLimit` | `Slots` registry |
| `COMPARE_EXCHANGE` | const | 25-31 | renderer storage-key constants (`apps/app` C6) | here |
| `CREDENTIAL_SLOTS` | const | 33 | `"cloud:production"` 32× | `Slots` |

## Proposed end state
~30 lines: the three lists and `POLICY`; no forwards.

## Verification
`test/renderer-slot-policy.test.mjs`, `test/native-secure-slots.test.mjs`, `ConnectionInstrumentedTest`.
