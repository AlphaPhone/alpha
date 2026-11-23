# test/browser/attachment-lifecycle.spec.ts
- Lines: 20 | Kind: Playwright spec, chromium; module-in-page (T6), no user action | Verdict: DELETE
- Covers: closing a reviewed attachment revokes its object URL once; a late `close` from a replaced preview does not retire the new one; `pagehide` revokes. Duplicates: `attachment-accessibility.spec.ts` (Back closes the dialog). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 16 | P3 | `URL.revokeObjectURL` monkey-patched to count revocations: internal resource hygiene, not user-visible. | Delete. | Low. |
| 2 | 7, 17 | P2/T6 | Opens previews through plugin imports; second test has no UI at all. | Delete. | Low. |

## Proposed end state
File deleted. "Back closes the attachment" is a step in the inbox journey (from `attachment-accessibility`). Object-URL leak coverage is lost (acceptable: no user-visible effect).
