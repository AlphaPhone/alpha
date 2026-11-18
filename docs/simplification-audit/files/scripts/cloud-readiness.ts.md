# scripts/cloud-readiness.ts
- Lines: 255 | Kind: script (operator CLI: Cloud registration values + unauthenticated readiness probe) | Verdict: KEEP + SIMPLIFY
- Covers: prints the values an Eliza Cloud operator must enter for Alpha (H-11…H-15) and probes the deployed Cloud for each gate without credentials. Callers: README.md:217,244,257 (documented manual operator step); `test/cloud-readiness.test.mjs`; mentioned in `test/cloud-speech-stream.test.mjs`. No npm or CI caller — it is a by-hand tool and the README makes it part of the release runbook, so not dead.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46 | D4 | `CALLBACK_PATH` is an alias of `CLOUD_SIGN_IN_REGISTRATION.callbackPath`, exported only for the test. | Use the policy constant directly. | Low |
| 2 | 58-59 | B4 | Re-validates `CLOUD_DEPLOYMENT` and checks `if(!deployment)` for a typed key. | Index directly. | Low |
| 3 | 70-71 | C5 | `callback` duplicates `nativeAuthCallbackRegistration(...).redirectUri` computed on the next line. | Take both from one `nativeAuthCallbackRegistration` call. | Low |
| 4 | 50 | C3 | Local `readJson`; one of 12 copies. | `scripts/lib` helper. | Low |
| 5 | 227-239 | C3 | Hand-written `parseArgs`; one of 8. | `node:util parseArgs`. | Low |
| 6 | 116 | C3 | Local plain-object guard `object()`. | Shared helper. | Low |
| 7 | 1-36 | — | 35-line header doc is long but is the operator documentation the README points to. | Keep, trim to usage + gate list. | — |

## Proposed end state
Same CLI (`registration`, `probe`), shared arg/JSON helpers, no aliases, ~210 lines. Its test (`cloud-readiness.test.mjs`) is reviewed in its own report; it injects `fetchImpl`, which is the right seam.
