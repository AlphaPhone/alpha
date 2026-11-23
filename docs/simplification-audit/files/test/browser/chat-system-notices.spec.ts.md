# test/browser/chat-system-notices.spec.ts
- Lines: 102 | Kind: Playwright, `chromium` project; UI journey over a hand-written bridge emulating a remote paired agent (`{kind:'remote'}`) | Verdict: **DELETE**; carry the combined-notice case into `journeys/chat.spec.ts`
- Covers: (1) notices after an unanswered message collapse to one and a later reply retires it; (2) a combined model + runtime notice shows "No AI provider · Open Settings" once and "Agent degraded", with no "send again" step. Duplicates: test 1 is title- and journey-identical to `chat-system-notices.production.spec.ts:18`. Test 2 is only here. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-91 | T4 | Duplicate of the production test. | Delete. | none |
| 2 | 93-102 | none | Combined notice is unique coverage of the notice copy mapping. | Carry into the chat journey on the resident stub (seed one assistant row with both notices joined by `\n---\n`). | Low. |
| 3 | 16-66 | A3 (D5), P6 | 50-line inline bridge for a remote agent (`remote:` secure slot, `/api/auth/me`, `/api/agents`, device registration). | Gone with the file. | none |
| 4 | 3-7 | A8 | Evidence-boundary comment. | Gone. | none |

## Proposed end state
Delete the file after the combined-notice step exists in `journeys/chat.spec.ts`.
