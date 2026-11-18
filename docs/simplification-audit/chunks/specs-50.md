# Chunk specs-50: services Quint models DevelopmentDigestPending … MobileBundleAdmission

19 live models from `specs/quint/services/` (all in `services/manifest.json`, all checked by `scripts/check-quint.ts`,
all with a refinement harness under `specs/quint/refinement/services/`). None models a feature that DECISIONS deletes
(no Wallet, backup, client Calendar linked sync or hosted pairing). One carries a legacy reader (B297) and one is a
twin of another model.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| DevelopmentDigestPending.qnt | model, digest pending CAS (renderer + dev host) | KEEP, SIMPLIFY | drop `legacy` phase with B297 (D1); keep raw-byte CAS on a `review` record |
| EmbeddingStoreIdentity.qnt | model, upstream-only (patched core) | KEEP | upstream-lock lane |
| FactWriteScope.qnt | model, upstream-only | KEEP | upstream-lock lane |
| GmailAgentMailboxRecovery.qnt | model, upstream managed Gmail host + `cloud-protocol.ts` | KEEP | upstream lane + `cloud-protocol.ts` |
| GoogleAccounts.qnt | model, Google account lifecycle | KEEP | harness imports via `sourceModule`; drop hash ceremony |
| IdentitySession.qnt | model, native Cloud sign-in (composed by 2 native compositions) | KEEP | Java whole-file campaign; narrow `connection-ui.tsx` source after split |
| InboxCoordinator.qnt | model, Inbox composer (defines `RetainedInboxOperation`) | KEEP | stub ports by full path |
| InboxDelivery.qnt | model, single Inbox operation | KEEP | fix "compatibility macro" comment |
| InboxEditCoalescer.qnt | model, edit coalescer | KEEP | delete 16 symbol pins |
| InboxListPaging.qnt | model, list paging | KEEP; harness PORT | stop text-rewriting `inbox-coordinator-ports.mjs` and the `let loadingMore` anchor injection into `inbox-cloud-adapter.ts`; export paging state |
| InboxProviderDrafts.qnt | model, Gmail draft create/replace/delete | KEEP | — |
| LifeOpsScheduledTaskRoute.qnt | model, upstream-only | KEEP | upstream lane; documents an upstream occurrence-fence bug |
| MapsConnection.qnt | model, Cloud Maps coverage | KEEP; harness PORT | export `readCloudMaps` instead of slicing its line from `maps-adapter.ts`; delete symbol pins |
| MapsGuidanceVoice.qnt | model, spoken guidance | KEEP | delete symbol pins |
| MapsNavigation.qnt | model, twin subset | MERGE | into `MapsNavigationGuidanceReadback.qnt`, renamed `MapsNavigation.qnt` |
| MapsNavigationGuidanceReadback.qnt | model, navigation as built | KEEP (merge target) | delete source "canary" mutants and hash rounds in `maps-screen-source.mjs` |
| MapsScreenModes.qnt | model, Maps screen modes | KEEP | delete symbol pins; owner question on 3 violated desired properties |
| MmsCompose.qnt | model, MMS composer | KEEP; harness PORT | stop injecting `__smsDraftProbe` at `' const sync=()=>{'` in `sms-adapter.ts`; export compose controller |
| MobileBundleAdmission.qnt | model, build receipt tooling | KEEP | tooling lane; tied to receipt's existence |

Totals: 18 KEEP (3 with harness PORT, 1 SIMPLIFY), 1 MERGE, 0 DELETE.

## Behaviours that would lose all coverage if the DELETEs happen
None: no file here is deleted. The MERGE keeps every `MapsNavigation` run (the readback model already has the same four
runs, extended). Care point: `maps.mjs` traces (failed reroute through the real `DeviceMapsNavigation` +
`createCloudMaps`) must be carried into the merged harness, or the failed-reroute refinement loses its only runner.
DevelopmentDigestPending's B297 simplification must keep a pretty-encoded record in the raw-byte CAS run, or the
"equivalent re-encoding is a conflict" property loses coverage.

## Shared helpers worth keeping
- `refinement/services/inbox-coordinator-ports.mjs`: real-module Inbox bundle used by four harnesses (coordinator,
  cleanup, provider drafts, list paging). Keep; give it an `observe`/plugin option so `inbox-list-paging-ports.mjs`
  stops text-rewriting it.
- `refinement/services/support.mjs` `sourceModule`: the right pattern (bundle real module, stub named ports). Drop its
  double-compile/hash step once (affects GoogleAccounts, MapsNavigation and others).
- `forward-replays.mjs` + `observed-replay.mjs`: run InboxEditCoalescer, MapsConnection, MapsGuidanceVoice, MmsCompose.

## Cross-file actions
1. Manifest: delete `symbols` for InboxEditCoalescer (16), InboxListPaging (10), MapsConnection (13), MapsGuidanceVoice
   (8), MapsScreenModes (8), MmsCompose (15); drop un-executed sources (`maps-adapter.ts` for MapsGuidanceVoice /
   MapsScreenModes, `connection-ui.tsx` for MapsConnection/IdentitySession after the split).
2. Product exports the PORTs need: `readCloudMaps` (maps runtime), an Inbox paging module with `inspect()`, an MMS
   compose controller with `snapshot()`. All three fit the planned D2 adapter rewrite of `inbox-cloud-adapter.ts`,
   `maps-adapter.ts` and `sms-adapter.ts`.
3. Runners (T4): every model here runs in a per-model `test/quint-*.test.mjs` and again in
   `test/quint-services-refinement.test.mjs`; keep one services runner; drop exact trace/checkpoint count asserts.
4. Lanes (P1/P6): upstream-lock lane for EmbeddingStoreIdentity, FactWriteScope, LifeOpsScheduledTaskRoute,
   GmailAgentMailboxRecovery; build-tooling lane for MobileBundleAdmission; Inbox, Maps, Sign-in, Digest lanes by path.
5. With B297: update `DevelopmentDigestPending.qnt`, `development-digest-pending-probe.mjs` and its wrapper test together.
6. With the MapsNavigation merge: update `services/index.mjs:140`, `scripts/test-maps-device-navigation.ts`,
   `scripts/test-connection-history.ts`, `test/optional-view-channel-chat.test.mjs` references.

## Owner questions
- MapsScreenModes: a late "Use current location" fix overwrites a newer typed search/typed origin, and the locating
  flag outlives a chosen origin (three desired properties asserted as violated). Fix the product or accept?
- LifeOpsScheduledTaskRoute: the upstream runner lets an old claim egress after complete→reopen (occurrence ABA). File
  upstream?
- MobileBundleAdmission: keep a formal model of the mobile build receipt, or replace the receipt by a rebuild check
  and delete model + harness?
