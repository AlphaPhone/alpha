# specs/quint/refinement/services/sign-in-coordinator.md
- Lines: 98 | Kind: harness documentation | Verdict: KEEP (REWRITE, ~30 lines)
- Covers: describes `sign-in-coordinator.mjs` (IdentitySession refinement on a JVM against Alpha `AlphaCloudSignInPlugin.java` and the patched shared `CloudSignInPlugin` family). Duplicates: the `assumptions` strings in `sign-in-coordinator.mjs:49-53` and the obligation row in `services/index.mjs:135` say the same scope. Callers/importers: none (documentation; referenced by nothing but its own name).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 92-93 | A8 | Says "seventeen schedules"; the harness runs 21 (`defaultScenarios`, and `test/quint-signin-refinement.test.mjs` asserts 21). Email/phone/MFA schedules are listed as "outside" (line 89-90) but `email-code-cap`, `phone-code-cap`, `email-mfa` now run. | Fix counts and the out-of-scope list. | None |
| 2 | 10-12, 81-83 | B5 | Describes hash binding of "all product, driver and support file hashes" and the receipt; evidence ceremony that is being removed. | Drop once receipts go. | None |
| 3 | 66-67 | A8 | "`CurrentActivationProjection` checks the legacy current-attempt fields" — "legacy" narrates model history. | Describe what the projection compares. | None |
| 4 | 17-34 | – | The observation → model-projection table is the useful part. | Keep. | – |

## Proposed end state
Title, one paragraph on what runs (real Alpha + patched shared Java on a JVM with controlled Android/HTTP ports, fresh
JVM per schedule), the mapping table, and a short "outside this check" list (App Link verification, Keystore, real
HTTPS, process death). Counts removed so the doc cannot go stale.
