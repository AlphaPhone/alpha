# test/browser/inbox-hostile-attachment.spec.ts
- Lines: 287 | Kind: Playwright security journey (chromium); fake Cloud transport feeding the real `CloudProtocol` validation | Verdict: KEEP as `journeys/inbox.spec.ts` › "hostile attachments" describe (or its own `journeys/inbox-attachments.spec.ts` if the inbox journey gets too long); one small rewrite
- Covers: HTML/SVG attachments with script are never rendered (no requests, navigation, dialogs, popups, frames or elements), Save to Files keeps the exact bytes and opening in Files is inert; type/byte mismatches and URL-like/traversal names are refused with the right message and no Retry; oversized/understated/hash-mismatched files refused before or after bytes; accounts without opaque saving request no bytes; Ask Alpha staging excludes attachment names/bytes and never posts; a PNG/HTML polyglot is shown only in an empty-sandbox blob iframe and download is a `blob:` anchor. Duplicates: `inbox-save-attachment.spec.ts` (exact bytes saved once, digest mismatch rejected), `inbox-attachment-layout.spec.ts` (markup inert, Ask Alpha staging). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57-62 | — | Good boundary: the fake is the HTTP transport under the real `CloudProtocol`, so the product's response validation runs. This is the pattern the shared Gmail harness should copy. | Use as the model for `harness/gmail.ts`. | — |
| 2 | 225-228 | T6 | Walks React fibers from `#root` to find `shell.mailAttachment` and call `validate()`, reading product internals. | Assert the staged context through what Send would post: stub the agent transport (`alphaClient` HTTP) and click Send in a sandboxed agent fixture, or keep only the `alphaClient.getState().context` check (already at 219/230). Delete the fiber walk. | Low |
| 3 | 33, 265 | T8 | `waitForTimeout(400/600)` "a refresh, onload or image fetch would have fired by now". A negative-evidence wait; acceptable but should be one named constant in the harness. | Keep, centralise. | Low |
| 4 | 45 | A1 | Seeds `alpha:startup-permission-walkthrough:v1` with `version:1` to skip the walkthrough. If historical walkthrough versions are deleted (A1), a v1 record may no longer count as completed. | Use the harness `seedCompletedAccessSetup` like other specs. | Medium |
| 5 | 101, 136, 173, 239 | T8 | 120 s timeouts on four tests (each reloads into Files). | Keep while Files reloads; revisit after module warm-up. | Low |

## Proposed end state
Kept nearly whole (it is the security proof for attachments): six cases on the shared Gmail harness, fiber walk removed, startup seeding through the shared helper. Absorbs the two unique cases of `inbox-save-attachment.spec.ts` (held read aborted on leaving review; filename collision keeps the original).
