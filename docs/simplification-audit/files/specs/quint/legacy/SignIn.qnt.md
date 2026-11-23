# specs/quint/legacy/SignIn.qnt
- Lines: 171 | Kind: Quint model, historical design comparison (with temporal property) | Verdict: DELETE (with C17)
- Covers: the 2026-11 Cloud sign-in design (native Google consent vs Custom Tab, offline saved sign-in, email resume, tap budget). Duplicates: live `services/IdentitySession.qnt`, `application/SignInChooser.qnt`, `SignInReadinessProbe.qnt`, `DevBridgeSignIn.qnt`; Playwright `accessibility-sign-in.production.spec.ts`. Callers/importers: `legacy/manifest.json` (sources `runtime/connection-ui.tsx`, `runtime/cloud-sign-in-ui.tsx` as historical links), `legacy/sign-in/check-sign-in-refinement.mjs`, `test/quint-legacy-sign-in-refinement.test.mjs`, README TLC example; cited by formal audit 06 (C3, A1, A20).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | ~104 | P6 | Models a `NativeConsent` (GMS) path that was never built (formal audit A20). Not a description of the product. | Delete. | Low |
| 2 | 160-162 | — | `offlineEmailResumesTest` is the only formal artefact touching the native cooldown bug (audit C3: `lastEmailSendAt` stamped before send succeeds). Deleting it removes that reference, not a protection (the model is historical and no test pins the native stamp). | Record C3 as an open product bug; if fixed, cover in `IdentitySession.qnt` or an Android instrumentation test. | Low |
| 3 | — | T4 | Current sign-in sequencing is modelled by `IdentitySession`/`SignInChooser`. | None. | — |

## Proposed end state
Deleted with the legacy family, its harness `legacy/sign-in/**` and its test. The C3 cooldown/resume issue stays listed as an owner bug in `cross-file-actions.md`; it is not covered today by any live check.
