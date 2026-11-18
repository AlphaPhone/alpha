# test/renderer-slot-deployment-namespace.test.mjs
- Lines: 32 | Kind: host-JVM integration (real `RendererCredentialSlots`, `CloudDeployment`, upstream `SecureSlotPolicy`) | Verdict: KEEP, MOVE to Gradle `RendererCredentialSlotsTest.java`
- Covers: Renderer secure slots cannot address the physical Cloud deployment namespace or Google return slots; ordinary renderer slots still work. Duplicates: none Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-29 | T7-ish | Java test source in a JS template string. | Write it as a Java test class in the Gradle test set. | Low |

## Proposed end state
- `RendererCredentialSlotsTest` (with the SMS ledger cases from renderer-slot-policy).
