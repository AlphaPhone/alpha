# specs/quint/services/WorkflowNoticeTaps.qnt
- Lines: 118 | Kind: Quint model (live; product workflow notification taps) | Verdict: KEEP; PORT harness (`workflow-local-source.mjs#checkWorkflowNoticeTaps` slices `workflow-adapter.ts` by marker)
- Covers: a tapped workflow notification is read, rechecked against operations/view generations, opened once as a run (consume retried without reopening) or reviewed as a question (cancel returns the tap; compose consumes first). Duplicates: Lemma `workflow-device-contract.dfy` proves `readyTapStep` never opens one token twice (function-level, complementary); native side has `refinement/native/workflow-notice-delivery.mjs` + `WorkflowNoticeTraces.java` for delivery (different component). Callers/importers: `quint:check`; `checkWorkflowNoticeTaps` (aggregate `services/index.mjs:73`, `test/quint-workflow-local-source.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness `workflow-local-source.mjs:146-152` | T2 / T10 | Cuts `prototype/workflow-adapter.ts` between the literals `" let tapBusy=false"` and `' const dismissTap='`, prepends a hand-written list of 20 outer variables, appends `globalThis.inspect`, strips types and runs it in `vm` with fake `connectionController`, `alphaClient`, `Capacitor`, `registerPlugin`. Mutation canary replaces `openedTap=result.token;`. Breaks on any reformat or split of the adapter. | PORT: extract the tap handler (`checkNotice` and its five flags) from `workflow-adapter.ts` into an exported factory, e.g. `runtime/workflow-notice-taps.ts` `createNoticeTapHandler({native, resolve, intentStore, open, review, isOperationBusy})`, which the adapter calls; the harness imports and drives it. | Medium (product extraction, aligns with D1/D2 splitting of the adapter) |
| 2 | harness / test | T5 | Canary `'forget-opened-tap'` and `test/quint-workflow-local-source.test.mjs:7` test the harness. | Delete. | Low |
| 3 | manifest | T10 | 15 symbol pins plus `sources` listing `android/.../WorkflowNoticeTaps.java` (13 lines) that the harness never runs; the Java side is modelled in `native/manifest.json`. | Drop `symbols`; drop the Java source from this entry. | Low |
| 4 | — | coverage | The harness only observes non-question run taps (its own assumption text says so); question review/cancel/compose and generation races are model-only. | Accept, or cover question review in a Playwright `journeys/workflows.spec.ts` case. | Low |

## Proposed end state
Model unchanged. Tap handler is an exported module the adapter uses; the harness imports it directly with closed
native/intent ports. No marker slicing, no canary, manifest pins files only.
