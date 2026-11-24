# specs/quint/refinement/services/inbox-provider-draft-ports.mjs
- Lines: 76 | Kind: Quint refinement fixture extension (replaces the fixture's Gmail prepare/draft/dispatch ports with a provider-draft model) | Verdict: KEEP; MERGE into `inbox-coordinator-ports.mjs` when touched
- Covers: fake Gmail provider-draft behaviour (digest-checked replace/delete, forward source history, review transform) so the real coordinator runs `InboxProviderDrafts.qnt` schedules. Duplicates: the base `gmailPrepareOperation`/`gmailDispatchOperation` in `inbox-coordinator-ports.mjs` (near copy with draft fields). Importers: `inbox-provider-drafts.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-41, 50-75 | C5 | Prepare and dispatch fakes repeat ~70 % of the base fixture's fakes (digest, receipt map, events, counters). | Give the base fixture one provider fake with optional draft state; delete the override file. | Low |
| 2 | 15 | C3 | Own `digest` SHA-256 helper; the base fixture inlines another. | One helper. | Low |
| 3 | 2, 43 | — | Comments state that only external Gmail responses are faked and that `messageId` mirrors `CloudProtocol.gmailDraft`: good "why". | Keep. | — |

## Proposed end state
Provider-draft state becomes an option of `createInboxFixture({providerDrafts: true})`; this file goes.
