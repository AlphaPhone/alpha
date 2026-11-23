# apps/app/src/runtime/native-assistant-draft-recovery.ts
- Lines: 14 | Role: adapts upstream `rawSlotDraftRecovery` (raw native draft slot capture/reset) to Alpha's recovery-dialog `DomainRecovery` shape, filling the browser-only legacy fields with constants. | Verdict: SIMPLIFY
- Importers: 2 (`prototype/inbox-unsaved.ts`, `runtime/assistant-draft-store.ts`). Text/path pins: `test/browser/assistant-draft-storage.spec.ts:33,56`, `test/inbox-draft-copies.test.mjs`, `test/inbox.test.mjs`, `test/support/feature-parity.mjs:560`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | A1 | `return {snapshot,raw,legacy:null,format:'domain',legacyChanged:false}` — exists only to satisfy `DomainRecovery`'s `legacy`/`legacyChanged` fields (`browser/domain-document.ts:10-15`), which describe the legacy `localStorage` import envelope `{version:1,legacy,value}`. DECISIONS D1 removes legacy envelopes. | When `DomainRecovery` drops `legacy`/`legacyChanged` (and `BrowserDomainDocument` its `legacy` constructor argument), this adapter reduces to `{...shared, capture: async s => ({...await shared.capture(s), format:'domain'})}`, or is deleted if `DomainRecovery` adopts upstream's capture shape directly. | Medium: `browser/domain-document.ts` and every `openDomainRecovery` caller (hosted-digest-ui.tsx:299, media-copy-intent.ts, notes/calendar documents) change together; current persisted envelope bytes must stay readable or be declared dev-only. |
| 2 | 6 | A8 | "(a native slot has no legacy browser copy)" — will be stale after #1. | Delete with #1. | None. |

## Local types and helpers
None (uses `DomainRecovery` from `browser/domain-document.ts`, `DurableDraftRawSlot` upstream).

## Proposed end state
≤6 lines, or deleted with callers using `rawSlotDraftRecovery` directly once `DomainRecovery` matches the upstream capture shape.

## Verification
`test/browser/assistant-draft-storage.spec.ts` (corrupt-slot recovery), Inbox unsaved-draft recovery journey, Android assistant draft recovery on device.
