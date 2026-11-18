# test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInChainTest.java.txt
- Lines: 662 | Kind: transplant (Java template with 15 `ACTUAL_*` markers filled from upstream `CloudSignInPlugin.java` by `chain-methods.mjs`) | Verdict: KEEP (live Quint dependency); MERGE the Alpha-only scenarios upstream, then point the Quint harness at the staged upstream template
- Covers: verify/connect/token/ack chain (64 scenarios vs upstream 38): code verification ownership, startup ack recovery, browser callback races (foreign/duplicate/browser-MFA/cancelled/stale), email/SMS send and resend with cooldown and credential-intent rules, consent-denied, revocation only of the replaced key, durable cancel retirement, destroy shutdown.
- Duplicates: fork of `vendor/eliza/packages/auth/android/test/ai/eliza/auth/cloud/CloudSignInChainTest.java.txt` (369-line diff; most of upstream's cases are carried verbatim or re-flowed onto one line).
- Importers: `native-sign-in.test.mjs:283-293` (fork) and `specs/quint/refinement/native/google-browser-return-claim.mjs:15` (template for the live `GoogleBrowserReturnClaim` refinement, which also adds observation seams by `replaceOnce` on literal lines and on `' static void check(boolean value'`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4 / C5 | Fork of an upstream file: a pin bump that touches either file forces a manual three-way rebase (guarded by `upstream-base.json`). | Upstream the extra scenarios and the `ChainPluginBase`/`Handler`/`Worker` changes; then the Quint harness reads `native.root/packages/auth/android/test/.../CloudSignInChainTest.java.txt` (it already reads `TestRegistration.java` from there). | Medium |
| 2 | whole | T10 | Quint harness depends on literal lines in this template (`'  run(() -> {'`, `' static void check(boolean value'` etc. via the injected bodies). | Keep until upstream exposes the chain as a callable class (see `chain-methods.mjs` report). | Low |
| 3 | whole | D8 | Many 300+ character lines (re-flowed from upstream's multi-line form), making the diff to upstream noisy. | Restore upstream formatting when merging upstream. | None |
| 4 | — | coverage | If deleted, browser callback races, SMS/email resend and consent-denied scenarios lose all coverage in Alpha, and the Quint model breaks. | Do not delete before row 1. | High |

## Proposed end state
Short term: unchanged, moved with `chain-methods.mjs` under `specs/quint/refinement/native/` as a Quint input. Long term: upstream carries it; Alpha deletes the copy and the harness uses the staged upstream file.
