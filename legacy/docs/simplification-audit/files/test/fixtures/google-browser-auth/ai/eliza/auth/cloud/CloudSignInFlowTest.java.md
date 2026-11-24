# test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInFlowTest.java
- Lines: 185 | Kind: unit (plain-JVM test of upstream pure policy classes `CloudSignInFlow`, `CloudSignInReadiness`, registration builder; no slicing) | Verdict: DELETE fork; MERGE the 20 added lines upstream
- Covers: registration, PKCE, callback parsing, pending record, routes, readiness and code adapters; Alpha adds (fork lines ~41-60): native mode default, explicit browser mode, no `automatic` mode, browser authorize URL binds tenant/callback/state/PKCE/`mfa=exchange`/`prompt=select_account` and omits the verifier, Google redirect admission (refuses look-alike hosts, http, non-443 port), Asset Links exact package/signer.
- Duplicates: `vendor/eliza/packages/auth/android/test/ai/eliza/auth/cloud/CloudSignInFlowTest.java` (21-line diff, all additions). Callers: `native-sign-in.test.mjs:183-191` (fork).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4 / T5 | 165 of 185 lines are upstream's test of upstream code, run twice per host-test invocation. | Delete fork. | Low |
| 2 | ~41-60 | T3 / coverage | The additions are pure-policy checks on the browser authorize URL and redirect allowlist — security-relevant and used by Alpha's browser mode. | MERGE upstream (same file). | Medium if dropped |

## Proposed end state
Deleted here after the 20 browser-mode lines land upstream and the pin advances.
