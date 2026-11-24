# specs/quint/application/SignInChooser.qnt
- Lines: 173 | Kind: Quint model (live: manifest, 9 scenarios, 7 invariants, 5 witnesses, 15 symbol pins, `sharedSources` `packages/auth/src/auth/native-cloud-sign-in.ts`) | Verdict: KEEP
- Covers: the Cloud sign-in chooser: Google wait and commit boundary, email/phone code steps, resend, spent codes, second verification, Back at each step and adoption of a key stored behind Back. Duplicates: behaviour also exercised by host tests `test/cloud-sign-in-state.test.mjs`, `test/chooser-direct-entry.test.mjs`, `test/google-native-mfa.test.mjs`, `test/google-cancel-committed-key.test.mjs` (not tied to the model). Callers/importers: manifest only; `application/README.md`; `docs/formal-model-audit-2026-11/06-identity-comms-dev.md`. No refinement harness.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | The only link to code is 15 regex symbol pins on `connection-ui.tsx`, `cloud-sign-in-ui.tsx`, `cloud-sign-in.ts` (`SignInView`, `signInFailed`, `showGoogleMfa`, `cancelSignIn`, `signInGoogle`, `signInEmail`, `resendSignInCode`, …). They prove names exist, not behaviour, and break on the planned `connection-ui.tsx` split (D1 god module) and renames. | Pin files, not symbols (T10): keep `sources`, drop `symbols`, or keep only exported names that survive the split. No harness to port. Optional follow-up: a replay over the sign-in controller once it is an importable module. | Low |
| 2 | 116, 241 | — | `adoptedByBack` exists only to feed `AdoptedByBackWitness`; acceptable witness bookkeeping. | None. | — |
| 3 | all | — | Cloud sign-in for managed services is live (PRD: "sign in only for managed services"); D5 deletes hosted-agent pairing, not this. | KEEP. | — |

## Proposed end state
Unchanged model. Manifest entry keeps `sources` and `sharedSources`, sheds the 15 symbol pins (or narrows to exported names) so the `connection-ui.tsx` split does not require model metadata edits. When the sign-in step logic is extracted from `connection-ui.tsx`, consider a small trace replay against it; until then the host tests listed above (or the `journeys/connection-cloud.spec.ts` journey that replaces them) carry implementation coverage.
