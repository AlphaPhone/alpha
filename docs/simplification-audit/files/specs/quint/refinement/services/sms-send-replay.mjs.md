# specs/quint/refinement/services/sms-send-replay.mjs
- Lines: 145 | Kind: Quint forward replay harness (bundles the real Messages adapter; one text-injected observation seam) | Verdict: KEEP + PORT (remove the text seam)
- Covers: `SmsSend.qnt` (live, `specs/quint/services/manifest.json:3070`) against `apps/app/src/prototype/sms-adapter.ts` + `runtime/image-sms.ts` via `test/fixtures/observed-sms-adapter.mjs`, with a held journaled telephony client: repeated operation IDs answered from the journal, no double dispatch, stale answers dropped, edits mint new IDs, retired uncertain drafts never re-dispatch. Duplicates: Case1 runs twice (`test/quint-sms-send.test.mjs` and `forward-replays.mjs:23`); Case2's two schedules are the model scenarios `acceptedDraftRetiredUntilOwnerEditsTest` and `retiredUncertainDraftResumesWithoutDispatchTest` already replayed in Case1. Callers/importers: `test/quint-sms-send.test.mjs`, `services/forward-replays.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 101-109 | T10 | Observations rely on `globalThis.__smsDraftProbe`, which `test/fixtures/observed-sms-adapter.mjs` injects by splitting `sms-adapter.ts` at the literal `' const sync=()=>{'` (asserts exactly one occurrence). Any reformat (D9 Prettier) or rename breaks it. | PORT: observe operation IDs through the client port (`sendSms(review, operationId)` and `smsSendResult` already see every ID) and `active` through `views.messages.render` output; if `sentId` cannot be observed from the port, export one read-only `smsDraftSnapshot()` from the adapter module (the only product change). Then the fixture becomes a plain bundle with stubs. | Medium |
| 2 | 129-142 | T4 | `runSmsSendCase2` hand-codes two schedules the model scenarios already cover. | Delete Case2. | Low |
| 3 | 120-125 | – | The canary (a model that keeps the operation ID after cancel must fail) proves the comparison is live; keep it once in the runner, not per aggregate (already gated by `canaries`). | Keep. | – |
| 4 | 15-23 | D13 | Stub targets the staged `.eliza/client-features/packages/contracts/src` by absolute path and stubs `runtime/aosp-telephony` by regex. | Keep until the `@eliza/*` alias lands; then import contracts through the alias. | Low |
| 5 | 62, 111 | D3 | Installs and deletes `globalThis.document` / `globalThis.__smsClient` per trace. | Acceptable for a Node harness; keep in `create/close`. | – |
| 6 | 1 | A8 | "Existing source-executing MBT harness, shared by its original owning tests and the strict services receipt." | Delete line. | None |
| 7 | 144 | T4 | `runSmsSendReplay` = Case1 without canaries for the aggregate. | Single export used by one runner. | Low |

## Proposed end state
~110 lines: `replaySmsSend({canaries})` runs 10 scenarios, 5 witnesses and 80 random walks against the real adapter,
reading identities from the telephony port (no text-injected probe), with the cancel-keeps-ID canary. Called once
from the manifest-driven refinement runner.
