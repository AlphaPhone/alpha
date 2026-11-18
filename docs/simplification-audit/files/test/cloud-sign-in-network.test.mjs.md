# test/cloud-sign-in-network.test.mjs
- Lines: 66 | Kind: mixed: source transplant of upstream Java (case 1 slices the `catch` handlers out of `vendor/eliza/packages/auth/android/.../CloudSignInPlugin.java` into a generated class, compiles with javac and runs it), unit (case 2, real `CloudSignInError.from` and `signInFailureMessage`) | Verdict: DELETE case 1 (upstream follow-up); MERGE case 2 into `test/integration/connection-cloud.test.mjs`
- Covers: the shared native sign-in maps DNS/connect/route failures to `offline` and timeouts/TLS/other IO to `unavailable`, or `cancelled` when the attempt was cancelled, without exception text; the renderer accepts only known codes and never shows server text. Duplicates: none in this repo; upstream owns `CloudSignInPlugin.java`. Callers/importers: `npm test` glob. Cost: javac + JVM (~3-5 s).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-48 | T2 / T5 | Tests vendor source by text slice (`  } catch (java.net.UnknownHostException` .. `  } finally {`). Alpha cannot change that code (AGENTS.md). | Delete; record as an upstream follow-up (D14) to add the classification test in `vendor/eliza/packages/auth/android`. | Low |
| 2 | 50-66 | T3 (acceptable) | Renderer side of the boundary: unknown codes collapse to `unavailable`, messages never echo server text. | Keep as one case in the integration file. | None |

## Proposed end state
File deleted. Case 2 becomes a short table in `test/integration/connection-cloud.test.mjs`. The Java classification is listed under upstream follow-ups.
