# test/browser/photo-email.spec.ts
- Lines: 54 | Kind: Playwright, chromium; UI from Photos to an Inbox draft over `helpers/photos-bridge`, after patching `secureConnectionStore`, `connectionController` and `Component.prototype.renderVals` and calling `VIEWS.inbox.fileEmailTarget()` | Verdict: MERGE into `journeys/inbox.spec.ts` (attachments section)
- Covers: Photo → Email opens a separate attachment review (checkbox before Attach), attaches the source bytes to a locally saved draft without any provider write; a changed revision, revoked access or changed owner is refused at Attach. Duplicates: file-to-email attachment specs (same `fileEmail` fixture shape). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 21, 27-28 | T6, D2 | Captures the shell by wrapping `Component.prototype.renderVals`, then calls `shell.openView('photos')`; polls `VIEWS.inbox.fileEmailTarget().ready`. | Navigate Home → Photos with the UI; wait on a visible Inbox state instead of the view hook. | Medium: the readiness wait needs a visible signal. |
| 2 | 12-14, 42 | T6 | Replaces `secureConnectionStore.read/compareExchange` with a sessionStorage stand-in and reads the draft back through it. | Use the harness `AlphaConnection` secure-slot fake; assert the draft through the reopened draft UI (attachment chip) plus one slot read. | Low. |
| 3 | 18-20 | T6 | Cloud client and snapshot patched on `connectionController`. | Harness Cloud stub. | Medium. |
| 4 | 47-54 | T7 | 3 variants for revision/access/owner. | Keep revision and access; owner change needs the controller patch and is internal. | Low. |
| 5 | 23 | — | Empty line inside the evaluate body. | — | None. |

## Proposed end state
Two cases in `journeys/inbox.spec.ts`: (1) Photo → Email review requires the checkbox, attaches source.png with exact base64 bytes to a local draft, no provider writes; (2) a changed photo revision or revoked access is refused at Attach. Uses `helpers/photos-bridge` plus harness Cloud and secure-slot stubs; no prototype patches.
