# specs/quint/refinement/native/canonical-notification-tap.md
- Lines: 37 | Kind: documentation of the `CanonicalNotificationTap` refinement | Verdict: KEEP (trim) or MERGE into the model header
- Covers: prose of the tap custody rules (waiting vs verified slot, five-minute window, acknowledgement consumes the token before the read port) and what the replay controls. Duplicates: the `.qnt` model comments and the driver's `assumptions`/`obligations`. Callers: none (`grep canonical-notification-tap.md` finds no reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37 | A8 | Points to `test/quint-canonical-notification-tap-refinement.test.mjs`, a per-model wrapper slated for DELETE (T4). | Point to the native family aggregate command instead. | Low |
| 2 | 1-35 | C5 | Restates the model and the driver assumptions. | Move the first two paragraphs into the `.qnt` header comment and delete this file (it is the only `.md` in the harness directory besides `google-browser-return-claim.md`). | Low |

## Proposed end state
Content lives in `specs/quint/native/CanonicalNotificationTap.qnt`; this file removed.
