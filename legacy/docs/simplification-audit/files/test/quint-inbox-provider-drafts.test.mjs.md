# test/quint-inbox-provider-drafts.test.mjs
- Lines: 42 | Kind: Quint wrapper (`node -e` child running `runInboxProviderDraftsRefinement`) + a source transplant (regex-extracts `provider.setEditor(…);` from `prototype/inbox-cloud-adapter.ts` and runs it in `vm.runInNewContext`) | Verdict: DELETE
- Covers: provider drafts refine reviewed requests, reference restoration and forward identity (25 traces); Alpha passes reviewed provider metadata to the draft editor. Duplicates: services index runs the same campaign in `quint-services-refinement`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-28 | T4, T9 | Aggregate duplicate wrapped in a `node -e` template-string program. | Delete. | None |
| 2 | 31-42 | T2 | Regex `/provider\.setEditor\([^;]+;/` slices one statement and evaluates it with fake `provider`/`drafts`: proves only that the statement forwards its three arguments. | Delete; cover "forwarded attachments reach the draft editor" in `journeys/inbox.spec.ts` (forward a message with an attachment, see it in the editor). | Low |
| 3 | 4-5 | Hygiene | `readFileSync` and `vm` imported for the transplant only. | Gone. | None |

## Proposed end state
Deleted. The model runs from the services index; the forwarding behaviour is a step in the Inbox journey.
