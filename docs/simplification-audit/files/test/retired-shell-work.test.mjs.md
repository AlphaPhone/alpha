# test/retired-shell-work.test.mjs
- Lines: 38 | Kind: transplant (one-line slice of `main.tsx` `refreshImage`; slice of the `finally` in `agent-adapter.ts`) | Verdict: DELETE
- Covers: image revocation hides and retires the raw Contacts view; a retired send's `finally` cannot clear a newer send's typing state. Duplicates: none found. Callers/importers: `npm test` glob; imports `runtime/image-contacts.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-22 | T2 | Slices one source line by its exact indentation (`'    const refreshImage=async()=>'`). | Delete. | Low |
| 2 | 24-38 | T2 | Wraps a sliced `finally` in `try {}` and calls it with a fake shell. | Delete. | Medium: typing-lease race loses host coverage |

## Proposed end state
File deleted. Typing-indicator ownership: one case in `journeys/chat.spec.ts` (send, cancel, send again before the
first reply settles; typing indicator stays until the second reply). Contacts image revocation is AOSP-image only;
leave to device acceptance.
