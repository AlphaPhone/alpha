# scripts/eval-device-action-clarification.ts
- Lines: 235 | Kind: script (manual model evaluation against a live loopback agent) + embedded self-test | Verdict: KEEP as manual eval (owner question) + SIMPLIFY: delete `--self-test`
- Covers: sends 9 fixed ambiguous/control prompts through the phone's device-proposal protocol and measures clarifying-question vs proposal rates; rejects every proposal and revokes the synthetic device. Callers: no npm/CI caller; `test/device-action-clarification-eval.test.mjs` runs `--self-test`; `test/device-capability-selection.test.mjs:7` imports `DEVICE_PROFILE`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 168-221, 225 | T5 | `selfTest()` is a test of the eval harness against a synthetic in-process agent; its wrapper test runs it in `npm test`. It proves nothing about the product. | Delete `selfTest`, `--self-test`, the `startLoopback` import, and `test/device-action-clarification-eval.test.mjs`. | Low |
| 2 | 38 | D7 | `DEVICE_PROFILE` is imported by `device-capability-selection.test.mjs` to test `selectDeviceCapabilities`, a product function. | That test should use its own profile literal (or be covered by an integration test of device registration). | Low |
| 3 | 88 | B1 | `git()` swallows failures to `null`, then `dirty` is computed as `null !== ''` → true. | Let git errors throw (the tool requires a checkout). | Low |
| 4 | 16 | A8 / D5 | Usage says `--token-file /path/to/paired-machine-token`; the local agent uses an owner token, pairing is deleted. | Say "owner token file". | Low |
| 5 | whole | owner | Is this eval still run? It is the only measurement of clarify-vs-act behaviour. | Owner: keep as a documented manual eval (add `npm run eval:clarification`) or delete. | — |

## Proposed end state
~160-line manual eval with a documented npm entry and no self-test; or removed if the owner no longer runs it.
