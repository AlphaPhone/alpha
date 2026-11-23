# test/browser/local-agent-stream.spec.ts
- Lines: 16 | Kind: Playwright chat spec, `chromium`, 1 test; transport attached by in-page import of `alpha-client.ts` (T6) | Verdict: MERGE into `journeys/chat.spec.ts`
- Covers: whitespace-only composer text is not sent; authored text (indentation, blank lines, trailing spaces) reaches the transport byte for byte. Duplicates: none exact; `local-agent-native-stream.spec.ts` uses the same setup. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T6 | `attachVerifiedTransport` from an in-page import. | Assert the request body the resident bridge fixture receives instead. | Low. |
| 2 | 10-14 | - | Blank-stays-local and exact-text cases are only here. | Carry as two steps of the chat send test. | Low. |

## Proposed end state
File deleted; two steps in `journeys/chat.spec.ts` send test (blank input sends nothing; authored text arrives unchanged).
