# test/fixtures/google-browser-auth/ai/eliza/auth/cloud/CloudSignInReadinessTest.java.txt
- Lines: 136 | Kind: transplant (`ACTUAL_MEASURE/STATUS/STATUS_OUTCOME/PROBE` sliced from upstream plugin) | Verdict: DELETE fork; MERGE browser-gate cases upstream
- Covers: readiness measurement, cache and single-flight probe; Alpha's change (42-line diff) replaces upstream's three browser checks with a four-gate loop (no browser / no verified link / no Asset Links / authorize not 302) asserting email and phone stay available, plus Custom-Tabs-only and default-browser-only availability.
- Duplicates: `vendor/eliza/packages/auth/android/test/ai/eliza/auth/cloud/CloudSignInReadinessTest.java.txt` (upstream has a weaker version of the same browser gates). Callers: `native-sign-in.test.mjs:295-329` (fork).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T2 / T5 | Transplant of upstream methods, tested from Alpha. | Delete here. | Low |
| 2 | ~87-101 | coverage | "Browser gate failure preserves email/phone" and "default browser alone keeps Google" are the cases that matter for Alpha's AOSP image (no Custom Tabs). | MERGE upstream. | Medium if dropped |

## Proposed end state
Deleted after the gate loop is upstreamed; nothing kept in Alpha.
