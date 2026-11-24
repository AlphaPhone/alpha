# test/chat-attachment-composer.test.mjs
- Lines: 42 | Kind: fixture-driven transplant (`test/fixtures/chat-attachment-composer.mjs`) + Quint refinement replay (`checkChatAttachments`) | Verdict: DELETE (T4)
- Covers: composer restores the draft after a pre-dispatch refusal; a held attachment save cannot publish after the owner or conversation changes; the refinement of the chat-attachments model. Duplicates: `test/quint-application-refinement.test.mjs` runs `checkChatAttachments` again via `specs/quint/refinement/application/index.mjs:6`; `test/browser/attachment-lifecycle.spec.ts`, `dev-message-attachments.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-42 | T4/B5 | Runs the same refinement as the application aggregate; asserts exact `traces === 12` (ceremony). | Delete; the aggregate (or `quint:check`) runs it. | None |
| 2 | 6-35 | T4 | Three hand-picked schedules over the same fixture the refinement drives. | Delete. | Low |
| 3 | - | - | `test/fixtures/chat-attachment-composer.mjs` is also imported by `specs/quint/refinement/application/chat-attachments.mjs`; it survives. | Move the fixture beside the harness once no host test imports it. | - |

## Proposed end state
Deleted. Chat-attachment owner/conversation fencing stays in the Quint refinement; "draft comes back after a refused
send" is a step of `journeys/chat.spec.ts` (from `attachment-lifecycle.spec.ts`).
