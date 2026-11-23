# specs/quint/application/ChatAttachments.qnt
- Lines: 63 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Composer attachment custody: reload keeps attachment, refused send restores draft, owner/conversation isolation, retired writes do not revive. Duplicates: Playwright chat attachment specs cover the visible flow. Callers/importers: `specs/quint/refinement/application/chat-attachments.mjs` (only via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`); no per-model wrapper), `test/fixtures/chat-attachment-composer.mjs`, `specs/quint/ui-return-review-20261109.md` (historical note).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 102-104 | T2/T10 | Slices `agent-adapter.ts` from `function attachmentKey(` to `\nconst preDispatchRefusals`, strips types; the fixture `test/fixtures/chat-attachment-composer.mjs:16-22` slices again. | Extract attachment custody from agent-adapter.ts (D1 split) to `runtime/chat-attachments.ts`; import it. | Depends on the agent-adapter split (stage F). |
| 2 | manifest sources | P1/A3 | Sources list `local-agent.ts`, `remote-protocol.ts`, `development-cloud-agents.ts`, `camera-adapter.ts`, `connection-ui.tsx`; the hosted/remote ones may be deleted under D5. | Re-check after stage A4; list only loaded files. | quint-lib throws on a missing source, so a deletion breaks every Quint command. |
| 3 | runner | — | Only the aggregate runs it. When aggregates go, add `test/quint-chat-attachments.test.mjs` (or run index entries per model). | Add per-model runner when the aggregate is removed. | Coverage loss if forgotten. |

## Proposed end state
Model unchanged; harness imports an extracted module; a per-model runner replaces the aggregate.
