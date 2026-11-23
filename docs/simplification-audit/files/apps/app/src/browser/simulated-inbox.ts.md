# apps/app/src/browser/simulated-inbox.ts
- Lines: 28 | Role: dev: local-only Inbox compose/draft/attachment overrides for the prototype view | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/
- Importers: 1 (simulated-apps.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 21, 24 (×2) | C3 (P5) | Email regex `/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/` written 4× although `address()` is defined at line 7. | Use `address()` everywhere (and share with calendar-sync-fields.ts:10 as `isEmailAddress`). | None. |
| 2 | 10 | D5/B4 | `if(!devSurfacesEnabled)return;` — only reachable through installDevelopmentApps. | Delete. | None. |
| 3 | 16, 21, 22, 24 | B1 | `catch{}` empty catches around api.set — failures vanish silently. | Remove; simulated-apps vset already toasts on save failure and rethrows. | Low. |
| 4 | 20-25 | D8/D9 | 1,000+ char `out.c={...}` literal with five handlers. | Named handler functions. | None. |
| 5 | 5-6 | C1/C2 | `Bag` and `registerPlugin<any>('AlphaMailAttachments')`. | Shared Bag + typed plugin. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| address | helper | 7 | calendar-sync-fields.ts:10 | lib isEmailAddress |

## Proposed end state
Dev override with named handlers, single email check, no empty catches. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 24 (current 28).

## Verification
dev inbox specs (inbox-compose-layout.spec.ts in dev profile), summary-source-note.spec.ts.
