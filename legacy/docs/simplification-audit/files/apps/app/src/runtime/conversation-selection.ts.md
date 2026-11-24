# apps/app/src/runtime/conversation-selection.ts
- Lines: 40 | Role: per-owner "restart into this conversation" choice, stored synchronously in `localStorage` on Android and in a `BrowserJsonDomainDocument` in the browser. | Verdict: SIMPLIFY
- Importers: 1 product (`runtime/connection-ui.tsx`). Text/path pins: `test/support/feature-parity.mjs` (allowlist), `specs/quint/application/manifest.json` (sources), `scripts/test-connection-history.ts`, `test/browser/conversation-selection-storage.spec.ts`, `test/browser/assistant-draft-recovery.spec.ts`, `test/conversation-restore-safety.test.mjs` (uses `selectConversation`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A7 | `export const conversationSelectionKey='alpha.connection.conversations.v1'`: 0 references outside this file (git grep -w). | Drop `export`; keep the constant and its value byte-for-byte (persisted key). | None |
| 2 | 35 | B3 | `const next={...values,[key]:...};validate(next);return next;` re-validates a value this function just built from a validated input plus a typed `id`. | Delete `validate(next);`. | None |
| 3 | 38 | B3 | `localStorage.setItem(k,next);if(localStorage.getItem(k)!==next)throw Error('Conversation selection could not be confirmed.')`: check-act-check read-back of a synchronous same-thread write. | Delete the read-back; `setItem` throws on quota. | Low |
| 4 | 13 | D8/D9 | 290-char single-line shape check (`!choice||typeof choice!=='object'||…||choice.revision!==undefined&&(…)`). | Extract `isChoice(item):item is ConversationChoice` (3 lines); use shared `isRecord` (C3). | None |
| 5 | 9, 13 | C3 | Inline plain-object guard `!value||typeof value!=='object'||Array.isArray(value)`. | Use the shared `isRecord` from the planned `runtime/parse.ts`. | None |
| 6 | 20, 26, 31 | C3 | `Capacitor.getPlatform()==='android'` evaluated three times. | Use `isAndroid` from `../native` (already the app-wide predicate). | None |
| 7 | 6, 12, 17, 35 | — (owner) | Two current persisted shapes for one key: Android writes a bare string id (`native?id:…`), the browser writes `{id,revision}`; readers accept both. Both are written today, so both stay unless the owner agrees to one shape. | Owner question; no change in this pass. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Choices` | type | 6 | no | stay |
| `ConversationChoice` | type | 5 | no | stay |
| `validate` | helper | 7-16 | structure guards in many storage readers (C3 `isRecord`) | stay, using `isRecord` |
| `choice` | helper | 17 | no | stay |
| `document` (module cache) | const | 18 | same lazy-import-and-cache idiom in `browser/*` document modules (C4) | stay |

## Proposed end state
Same two-platform API (`captureConversationChoice`, `selectConversation`, `conversationSelectionDocument`). Key constant private, no self re-validation, no read-back check, a named `isChoice` predicate, `isAndroid` instead of three platform calls. ~32 lines.

## Verification
`test/browser/conversation-selection-storage.spec.ts`, `test/browser/assistant-draft-recovery.spec.ts`, `test/conversation-restore-safety.test.mjs`, `scripts/test-connection-history.ts`; Quint `specs/quint/application/manifest.json` entries listing this source.
