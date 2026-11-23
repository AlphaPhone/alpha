# specs/quint/services/SmsSend.qnt
- Lines: 202 | Kind: Quint model (services family, live; 10 tests, 5 witnesses, 10 symbol pins) | Verdict: KEEP
- Covers: reviewed SMS send in the Messages composer (`prototype/sms-adapter.ts`, `runtime/image-sms.ts`, `runtime/aosp-telephony.ts`): an operation ID is minted only when the draft holds none, native answers a repeated ID from its journal (at most one dispatch per ID), closed records release the ID, a refusal before journaling releases it without a new revision, stale answers from an earlier visit/draft are dropped, read-back never grants send authority. Sources exist. Duplicates: native side `native/SmsDispatch*` models and `refinement/native/sms-dispatch.mjs` (journal in Java), `test/sms-action-journal.test.mjs`, `test/aosp-sms.test.mjs` (other chunks); no Quint duplicate of the renderer half. Callers/importers: manifest; harness `refinement/services/sms-send-replay.mjs` (drives the real adapter through `test/fixtures/observed-sms-adapter.mjs`; observed replay); `forward-replays.mjs` (aggregate) + `test/quint-sms-send.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest symbols | T10 | Pins include adapter closure names (`operationId`, `draftRevision`, `lifecycle`, `reconcile`) inside `installSmsAdapter`. | File pins. | Low |
| 2 | harness | D2 | Adapter is a monkey-patch `install*Adapter`; Stage F adapter rewrite moves the entry point. | Update `observed-sms-adapter.mjs` with the rewrite. | Medium |
| 3 | 15 | — | `retainedShown/retainedFrom` keep the last receipt across leave/open; exercised by `retainedRefusalIsNotNewAttemptAuthorityTest`. | Keep. | — |

## Proposed end state
Model unchanged; single run; file pins.
