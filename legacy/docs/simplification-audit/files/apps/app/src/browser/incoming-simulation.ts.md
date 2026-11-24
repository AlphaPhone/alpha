# apps/app/src/browser/incoming-simulation.ts
- Lines: 34 | Role: dev dialog that injects an incoming message/email into the simulated apps | Verdict: MOVE to apps/app/src/dev/ (or DELETE with simulator)
- Importers: 1 (simulated-apps.ts). Text/path pins: specs/quint/application/manifest.json; test/locale-time-usage.test.mjs (reads source text); test/browser/remaining-dialog-layout.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | D5/B4 | `if(!devSurfacesEnabled\|\|!browserDevProfile)return;` — only reachable via installDevelopmentApps, already gated twice. | Delete. | None. |
| 2 | 5 | C1 | `type Api=Record<string,any>` (Bag twin). | Shared Bag. | None. |
| 3 | 9-10, 33 | C4 (P4) | cssText + theme-copy + retire-event lifecycle. | Dialog kit. | Low. |
| 4 | 23 | C3 | Chunked `String.fromCharCode(...bytes.subarray(...))` base64; twins note-recording-journal.ts:24, prototype/note-source-adapter, phone-adapter, scan-pdf, runtime/local-agent (×2), native-recovery-backup. | lib `bytesToBase64`. | None. |
| 5 | 23 | C6 | Extension→MIME map; similar maps in runtime/inbox-attachment. | Use the inbox-attachment map. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Api | type | 5 | Bag ×15 | shared Bag |
| field | helper | 12 | location-simulation.ts:27 (near-identical) | dialog kit `labeledField` |

## Proposed end state
Dev dialog using dialog kit, shared field/base64 helpers, no inner guard. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 25 (current 34).

## Verification
test/browser/remaining-dialog-layout.spec.ts; delete the source-text check in test/locale-time-usage.test.mjs (T1).
