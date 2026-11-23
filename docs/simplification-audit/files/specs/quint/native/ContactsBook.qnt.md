# specs/quint/native/ContactsBook.qnt
- Lines: 162 | Kind: Quint model (live) | Verdict: KEEP
- Covers: address-book reads are current (epoch-fenced on pause/revoke), owner edit saves bind the shown revision and keep the editor on conflict, owner delete needs confirmation, agent create/edit/delete is only a proposal that needs owner approval and goes stale on external change; an unknown provider outcome is never replayed. Duplicates: `test/contacts-adapter.test.mjs:37` (host unit test of the editor save/version rule, T3); `DeviceActions.qnt` contacts read (`staleContactsReplyAfterPauseTest` = `staleReadAfterPauseTest` here). Callers/importers: `quint:check` (12 runs); `specs/quint/refinement/native/telephony.mjs:278-335` (`checkTelephonyContactsBook`, esbuild bundle of `apps/app/src/runtime/telephony-executor.ts`, calls exports), run from `refinement/native/index.mjs:171`; obligation `index.mjs:220`; doc comments in `apps/app/src/prototype/contacts-adapter.ts:17`, `apps/app/src/runtime/telephony-executor.ts:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — (good) | `telephony.mjs` bundles the real `telephony-executor.ts` and calls its exports with controlled address-book ports: the import style the audit wants everywhere. | Keep. | — |
| 2 | manifest `sources` | T10 / §2.3 | `apps/app/src/prototype/contacts-adapter.ts` is listed but not executed (obligation says "the owner editor has adapter tests"). It only causes `quint:changed` re-runs. | Drop it from `sources`, or extend the harness to bundle the owner-editor functions (preferred if the adapter exposes them as exports); then delete the duplicated cases in `test/contacts-adapter.test.mjs`. | Low |
| 3 | 114, 146, 155, 157 | B4 (vacuous) | `repeat = s' = s` is used in three scenarios to claim "a repeated approval or replayed operation id changes nothing". A stutter step cannot fail, so these scenarios prove nothing about replay. | Either model the replay (call `approve`/`approveUnknown` again and expect the guard to refuse) or drop `repeat` and the claim. | Low |
| 4 | 13 | — | Uses the older `check(condition)` action; siblings use `.expect`. | Optional: convert to `.expect` for uniformity. | None |
| 5 | 29-37 | — | `revoke`/`pause` retire proposals by setting `stale`, matching `PendingProposalIsCurrent`. Fine. | None. | — |

## Proposed end state
Model kept; `repeat` replaced by a real replay step or removed. Manifest `sources` lists only modules the esbuild
bundle executes. The duplicated contact-read case is dropped from `DeviceActions` (which is deleted, see its report),
and editor cases leave `test/contacts-adapter.test.mjs` once the harness bundles the editor exports.
