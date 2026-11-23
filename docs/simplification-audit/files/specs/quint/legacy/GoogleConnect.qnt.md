# specs/quint/legacy/GoogleConnect.qnt
- Lines: 168 | Kind: Quint model, historical design comparison (legacy family) | Verdict: DELETE
- Covers: Google connect design (native consent, return refreshes, incremental grant, revoke/decline, scopes never shrink, two taps to mail); 9 scenario runs plus temporal monitors. Duplicates: live models `application/GoogleConsentAdmission`, `GoogleAccessPublication`, `GoogleCalendarLinkFlow`, `GoogleCalendarAccessChoice`, `GoogleCalendarDisconnect`; native `GoogleAccounts`, `GoogleBrowserReturnClaim`. Callers/importers: `legacy/manifest.json`; `legacy/google-connect/check-google-connect-refinement.mjs`; `test/quint-legacy-google-connect-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (compare) and `:54` (temporal).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | P6 / D11 | Historical design translation. `legacy/manifest.json` entry says "Historical current/proposed design comparison at source ef9fbf7cd7 (or a view-refresh design), not a runtime conformance claim". It models no live product code as it stands; DECISIONS D11 retires `specs/quint/legacy`. | Delete model, its manifest entry, harness and test. | Low |
| 2 | manifest | T4 | Live application models cover the current implementation of the same surface (`application/GoogleConsentAdmission`, `GoogleAccessPublication`, `GoogleCalendarLinkFlow`, `GoogleCalendarAccessChoice`, `GoogleCalendarDisconnect`; native `GoogleAccounts`, `GoogleBrowserReturnClaim`). | Rely on the live models. | Low; see coverage note |
| 3 | — | T10 / B5 | Harness (`legacy/google-connect/check-google-connect-refinement.mjs` (receipt JSON at line 228)) hashes or reads product files as text and compares against recorded mismatch receipts; it does not import product modules. | Delete with the model. | None |
| 4 | 5, history | P4 | One of only three models (SignIn, GoogleConnect, Maps) that `quint:temporal` runs; all three are legacy. Deleting the family leaves `quint:temporal` with no input. | Delete the temporal step from `quint-model-check.yml` (or the workflow) and the `temporal` mode if nothing else declares temporal checks. | Medium: loses the only fairness-guarded liveness checks in CI |
| 5 | manifest | — | Sources name `runtime/google-connection-ui.tsx` and `runtime/cloud-protocol.ts`; both still exist but the model is a design comparison, not a refinement of them. | — | — |

## Proposed end state
Delete `specs/quint/legacy/GoogleConnect.qnt`, its `legacy/manifest.json` entry, `legacy/google-connect/check-google-connect-refinement.mjs` (receipt JSON at line 228), `legacy/manifest.json`; `legacy/google-connect/check-google-connect-refinement.mjs`; `test/quint-legacy-google-connect-refinement.test.mjs`; `.github/workflows/quint-model-check.yml:50` (compare) and `:54` (temporal).. Lower the `legacy` floor in
`test/quint-checker.test.mjs:32` (and then drop the `legacy` family from `scripts/quint-lib.ts:43`,
`scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts` once the Core models have moved, see
chunk summary). Invariants that encode still-wanted UX rules (ScopesNeverShrink, TwoTapsToMail) should be checked against the live twin's
invariant list before deletion; if missing, add them to the live model, not to a historical one.
